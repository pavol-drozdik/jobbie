#!/usr/bin/env python3
"""
Backup and restore JOBBIE Typesense snapshots to a private Cloudflare R2 bucket.

Supabase logical dumps are optional and independent. They are useful for
download/migration workflows, but this script intentionally does not restore a
live Supabase production database.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Sequence

import boto3
import requests


class BackupError(RuntimeError):
    pass


def env(name: str, default: str = "", *, required: bool = False) -> str:
    value = os.getenv(name, default).strip()
    if required and not value:
        raise BackupError(f"Missing required environment variable: {name}")
    return value


def env_int(name: str, default: int) -> int:
    raw = env(name, str(default))
    try:
        return int(raw)
    except ValueError as exc:
        raise BackupError(f"{name} must be an integer") from exc


TYPESENSE_URL = env("TYPESENSE_URL", "http://127.0.0.1:8108")
TYPESENSE_API_KEY = env("TYPESENSE_API_KEY", required=True)
TYPESENSE_DATA_DIR = Path(env("TYPESENSE_DATA_DIR", "/srv/nestjs-typesense/data/typesense"))
TYPESENSE_SNAPSHOT_HOST_ROOT = Path(
    env("TYPESENSE_SNAPSHOT_HOST_ROOT", "/srv/nestjs-typesense/data/typesense-snapshots")
)
TYPESENSE_SNAPSHOT_CONTAINER_ROOT = env("TYPESENSE_SNAPSHOT_CONTAINER_ROOT", "/snapshots").rstrip("/")
COMPOSE_FILE = env("COMPOSE_FILE", "/srv/nestjs-typesense/docker-compose.yml")
COMPOSE_PROJECT_DIR = env("COMPOSE_PROJECT_DIR", "/srv/nestjs-typesense")

R2_ENDPOINT_URL = env("R2_ENDPOINT_URL", required=True)
R2_ACCESS_KEY_ID = env("R2_ACCESS_KEY_ID", required=True)
R2_SECRET_ACCESS_KEY = env("R2_SECRET_ACCESS_KEY", required=True)
R2_BUCKET = env("R2_BUCKET", required=True)
R2_TYPESENSE_PREFIX = env("R2_TYPESENSE_PREFIX", "typesense/").strip("/") + "/"
R2_SUPABASE_PREFIX = env("R2_SUPABASE_PREFIX", "supabase/").strip("/") + "/"

AGE_RECIPIENT = env("AGE_RECIPIENT")
AGE_IDENTITY_FILE = env("AGE_IDENTITY_FILE")

SUPABASE_DB_URL = env("SUPABASE_DB_URL")
SUPABASE_CLI = env("SUPABASE_CLI", "supabase")
MAX_DISK_USED_PERCENT = env_int("MAX_DISK_USED_PERCENT", 80)


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H%M%SZ")


def redact_args(args: Sequence[str]) -> list[str]:
    redacted: list[str] = []
    redact_next = False
    secret_flags = {"--db-url", "--password", "--api-key", "--token"}
    for arg in args:
        if redact_next:
            redacted.append("<redacted>")
            redact_next = False
            continue
        redacted.append(arg)
        if arg in secret_flags:
            redact_next = True
    return redacted


def run(args: Sequence[str], *, cwd: Path | None = None) -> None:
    print("+ " + " ".join(redact_args(args)), flush=True)
    subprocess.run(list(args), check=True, cwd=str(cwd) if cwd else None)


def compose(*args: str) -> None:
    run(
        [
            "docker",
            "compose",
            "-f",
            COMPOSE_FILE,
            "--project-directory",
            COMPOSE_PROJECT_DIR,
            *args,
        ]
    )


def s3_client():
    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def directory_size(path: Path) -> int:
    if not path.exists():
        return 0
    total = 0
    for entry in path.rglob("*"):
        if entry.is_file() and not entry.is_symlink():
            total += entry.stat().st_size
    return total


def human_bytes(value: int) -> str:
    units = ["B", "KiB", "MiB", "GiB", "TiB"]
    current = float(value)
    for unit in units:
        if current < 1024 or unit == units[-1]:
            return f"{current:.2f} {unit}"
        current /= 1024
    return f"{value} B"


def ensure_disk_headroom() -> None:
    if MAX_DISK_USED_PERCENT < 1 or MAX_DISK_USED_PERCENT > 99:
        raise BackupError("MAX_DISK_USED_PERCENT must be between 1 and 99")

    TYPESENSE_SNAPSHOT_HOST_ROOT.mkdir(parents=True, exist_ok=True)
    disk = shutil.disk_usage(TYPESENSE_SNAPSHOT_HOST_ROOT)
    used_percent = round((disk.used / disk.total) * 100)
    live_data_bytes = directory_size(TYPESENSE_DATA_DIR)
    required_free = live_data_bytes * 2 + 1024**3

    print(
        "Disk check: "
        f"used={used_percent}% free={human_bytes(disk.free)} "
        f"typesense_data={human_bytes(live_data_bytes)}"
    )

    if used_percent >= MAX_DISK_USED_PERCENT:
        raise BackupError(
            f"Disk is {used_percent}% used; refusing backup at threshold "
            f"{MAX_DISK_USED_PERCENT}%."
        )
    if disk.free < required_free:
        raise BackupError(
            "Not enough free disk for a safe Typesense snapshot/archive. "
            f"Need about {human_bytes(required_free)}, have {human_bytes(disk.free)}."
        )


def create_tar_gz(source_dir: Path, archive_path: Path) -> None:
    with tarfile.open(archive_path, "w:gz") as archive:
        for entry in sorted(source_dir.iterdir()):
            archive.add(entry, arcname=entry.name)


def encrypt_if_configured(archive_path: Path) -> Path:
    if not AGE_RECIPIENT:
        print("WARNING: AGE_RECIPIENT is empty; uploading unencrypted archive.")
        return archive_path

    encrypted_path = archive_path.with_suffix(archive_path.suffix + ".age")
    run(["age", "-r", AGE_RECIPIENT, "-o", str(encrypted_path), str(archive_path)])
    archive_path.unlink(missing_ok=True)
    return encrypted_path


def decrypt_if_needed(downloaded_path: Path) -> Path:
    if not downloaded_path.name.endswith(".age"):
        return downloaded_path
    if not AGE_IDENTITY_FILE:
        raise BackupError(
            "Archive is encrypted. Set AGE_IDENTITY_FILE to the private age "
            "identity file path before restoring or downloading."
        )

    identity = Path(AGE_IDENTITY_FILE)
    if not identity.exists():
        raise BackupError(f"AGE_IDENTITY_FILE does not exist: {identity}")

    decrypted_path = downloaded_path.with_suffix("")
    run(["age", "-d", "-i", str(identity), "-o", str(decrypted_path), str(downloaded_path)])
    return decrypted_path


def upload_verified(local_path: Path, object_key: str, backup_kind: str) -> None:
    checksum = sha256_file(local_path)
    client = s3_client()
    print(f"Uploading {local_path.name} to r2://{R2_BUCKET}/{object_key}")
    client.upload_file(
        str(local_path),
        R2_BUCKET,
        object_key,
        ExtraArgs={
            "Metadata": {
                "sha256": checksum,
                "backup-kind": backup_kind,
                "created-at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    metadata = client.head_object(Bucket=R2_BUCKET, Key=object_key).get("Metadata", {})
    if metadata.get("sha256") != checksum:
        raise BackupError("Remote SHA-256 metadata verification failed after upload.")
    print(f"Verified remote upload metadata for {object_key}")


def download_verified(object_key: str, destination: Path) -> None:
    client = s3_client()
    metadata = client.head_object(Bucket=R2_BUCKET, Key=object_key).get("Metadata", {})
    expected = metadata.get("sha256")
    print(f"Downloading r2://{R2_BUCKET}/{object_key}")
    client.download_file(R2_BUCKET, object_key, str(destination))
    if not expected:
        raise BackupError(f"Remote object lacks sha256 metadata: {object_key}")
    actual = sha256_file(destination)
    if actual != expected:
        raise BackupError("Downloaded archive SHA-256 does not match remote metadata.")


def list_objects(prefix: str) -> list[dict]:
    client = s3_client()
    paginator = client.get_paginator("list_objects_v2")
    objects: list[dict] = []
    for page in paginator.paginate(Bucket=R2_BUCKET, Prefix=prefix):
        objects.extend(page.get("Contents", []))
    return objects


def latest_archive(prefix: str) -> str:
    archives = [
        obj
        for obj in list_objects(prefix)
        if obj.get("Key", "").endswith((".tar.gz", ".tar.gz.age"))
    ]
    if not archives:
        raise BackupError(f"No backup archives found under R2 prefix: {prefix}")
    return str(max(archives, key=lambda obj: obj["LastModified"])["Key"])


def request_typesense_snapshot(container_snapshot_path: str) -> None:
    response = requests.post(
        f"{TYPESENSE_URL.rstrip('/')}/operations/snapshot",
        headers={"X-TYPESENSE-API-KEY": TYPESENSE_API_KEY},
        params={"snapshot_path": container_snapshot_path},
        timeout=60 * 60,
    )
    if response.status_code >= 400:
        raise BackupError(
            f"Typesense snapshot API failed with HTTP {response.status_code}: "
            f"{response.text[:500]}"
        )


def backup_typesense() -> None:
    ensure_disk_headroom()

    stamp = utc_stamp()
    snapshot_name = f"snapshot-{stamp}"
    host_snapshot_dir = TYPESENSE_SNAPSHOT_HOST_ROOT / snapshot_name
    container_snapshot_dir = f"{TYPESENSE_SNAPSHOT_CONTAINER_ROOT}/{snapshot_name}"
    archive_path = TYPESENSE_SNAPSHOT_HOST_ROOT / f"typesense-{stamp}.tar.gz"
    upload_path: Path | None = None

    if host_snapshot_dir.exists() or archive_path.exists():
        raise BackupError("Backup path already exists for this timestamp.")

    try:
        print(f"Creating Typesense snapshot at container path {container_snapshot_dir}")
        request_typesense_snapshot(container_snapshot_dir)
        if not host_snapshot_dir.exists():
            raise BackupError(
                "Snapshot API succeeded, but mapped host snapshot directory was not created. "
                "Check TYPESENSE_SNAPSHOT_* paths and Docker volume mapping."
            )

        print(f"Compressing Typesense snapshot to {archive_path.name}")
        create_tar_gz(host_snapshot_dir, archive_path)
        upload_path = encrypt_if_configured(archive_path)
        upload_verified(
            upload_path,
            f"{R2_TYPESENSE_PREFIX}{upload_path.name}",
            backup_kind="typesense",
        )
    finally:
        shutil.rmtree(host_snapshot_dir, ignore_errors=True)
        archive_path.unlink(missing_ok=True)
        archive_path.with_suffix(archive_path.suffix + ".age").unlink(missing_ok=True)
        if upload_path and upload_path.exists():
            upload_path.unlink(missing_ok=True)


def backup_supabase() -> None:
    if not SUPABASE_DB_URL:
        print("SUPABASE_DB_URL is empty; skipping optional Supabase logical backup.")
        return

    stamp = utc_stamp()
    TYPESENSE_SNAPSHOT_HOST_ROOT.mkdir(parents=True, exist_ok=True)
    archive_path = TYPESENSE_SNAPSHOT_HOST_ROOT / f"supabase-{stamp}.tar.gz"
    upload_path: Path | None = None

    with tempfile.TemporaryDirectory(prefix="jobbie-supabase-dump-") as tmp:
        tmpdir = Path(tmp)
        roles = tmpdir / "roles.sql"
        schema = tmpdir / "schema.sql"
        data = tmpdir / "data.sql"

        try:
            run([SUPABASE_CLI, "db", "dump", "--db-url", SUPABASE_DB_URL, "-f", str(roles), "--role-only"])
            run([SUPABASE_CLI, "db", "dump", "--db-url", SUPABASE_DB_URL, "-f", str(schema), "--schema-only"])
            run(
                [
                    SUPABASE_CLI,
                    "db",
                    "dump",
                    "--db-url",
                    SUPABASE_DB_URL,
                    "-f",
                    str(data),
                    "--data-only",
                    "--use-copy",
                ]
            )

            print(f"Compressing Supabase logical dump to {archive_path.name}")
            create_tar_gz(tmpdir, archive_path)
            upload_path = encrypt_if_configured(archive_path)
            upload_verified(
                upload_path,
                f"{R2_SUPABASE_PREFIX}{upload_path.name}",
                backup_kind="supabase",
            )
        finally:
            archive_path.unlink(missing_ok=True)
            archive_path.with_suffix(archive_path.suffix + ".age").unlink(missing_ok=True)
            if upload_path and upload_path.exists():
                upload_path.unlink(missing_ok=True)


def safe_tar_members(archive: tarfile.TarFile, destination: Path) -> Iterable[tarfile.TarInfo]:
    base = destination.resolve()
    for member in archive.getmembers():
        target = (destination / member.name).resolve()
        if not str(target).startswith(str(base) + os.sep) and target != base:
            raise BackupError(f"Unsafe archive path rejected: {member.name}")
        if member.issym() or member.islnk():
            raise BackupError(f"Archive links are not permitted: {member.name}")
        yield member


def clear_directory(directory: Path) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    for entry in directory.iterdir():
        if entry.is_dir() and not entry.is_symlink():
            shutil.rmtree(entry)
        else:
            entry.unlink()


def wait_for_typesense_health(timeout_seconds: int = 120) -> None:
    health_url = f"{TYPESENSE_URL.rstrip('/')}/health"
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            response = requests.get(health_url, timeout=5)
            if response.ok:
                print("Typesense health check passed.")
                return
        except requests.RequestException:
            pass
        time.sleep(3)
    raise BackupError(f"Typesense did not become healthy within {timeout_seconds} seconds.")


def restore_typesense_latest(*, force: bool) -> None:
    if not force:
        raise BackupError("restore-typesense-latest requires --force")

    object_key = latest_archive(R2_TYPESENSE_PREFIX)
    with tempfile.TemporaryDirectory(prefix="jobbie-typesense-restore-") as tmp:
        tmpdir = Path(tmp)
        downloaded = tmpdir / Path(object_key).name
        download_verified(object_key, downloaded)
        archive_path = decrypt_if_needed(downloaded)

        extract_dir = tmpdir / "extract"
        extract_dir.mkdir()
        with tarfile.open(archive_path, "r:gz") as archive:
            members = list(safe_tar_members(archive, extract_dir))
            archive.extractall(extract_dir, members=members)

        print("Stopping only the Typesense container.")
        compose("stop", "typesense")
        try:
            print(f"Clearing existing Typesense data directory: {TYPESENSE_DATA_DIR}")
            clear_directory(TYPESENSE_DATA_DIR)
            print("Extracting restored Typesense data.")
            for entry in extract_dir.iterdir():
                shutil.move(str(entry), TYPESENSE_DATA_DIR / entry.name)
        except Exception:
            print("Restore failed after Typesense stop. Leaving container stopped for inspection.", file=sys.stderr)
            raise

        print("Starting Typesense container.")
        compose("up", "-d", "typesense")
        wait_for_typesense_health()


def download_supabase_latest(output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    object_key = latest_archive(R2_SUPABASE_PREFIX)
    downloaded = output_dir / Path(object_key).name
    download_verified(object_key, downloaded)
    archive_path = decrypt_if_needed(downloaded)
    print(f"Supabase dump archive is available at: {archive_path}")
    print("Do not restore this automatically over a live production Supabase database.")


def list_backups() -> None:
    for label, prefix in (("typesense", R2_TYPESENSE_PREFIX), ("supabase", R2_SUPABASE_PREFIX)):
        print(f"{label}:")
        objects = sorted(list_objects(prefix), key=lambda obj: obj.get("LastModified"))
        if not objects:
            print("  (none)")
            continue
        for obj in objects:
            key = obj.get("Key", "")
            size = obj.get("Size", 0)
            modified = obj.get("LastModified", "")
            print(f"  {modified}  {size} bytes  {key}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="JOBBIE Typesense/R2 backup utility")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("backup-all")
    sub.add_parser("backup-typesense")
    sub.add_parser("backup-supabase")
    restore = sub.add_parser("restore-typesense-latest")
    restore.add_argument("--force", action="store_true", help="Required for destructive restore")
    download = sub.add_parser("download-supabase-latest")
    download.add_argument("--output-dir", required=True, type=Path)
    sub.add_parser("list-backups")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.command == "backup-all":
            backup_typesense()
            backup_supabase()
        elif args.command == "backup-typesense":
            backup_typesense()
        elif args.command == "backup-supabase":
            backup_supabase()
        elif args.command == "restore-typesense-latest":
            restore_typesense_latest(force=args.force)
        elif args.command == "download-supabase-latest":
            download_supabase_latest(args.output_dir)
        elif args.command == "list-backups":
            list_backups()
        else:
            raise BackupError(f"Unknown command: {args.command}")
    except BackupError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    except subprocess.CalledProcessError as exc:
        print(f"ERROR: command failed with exit code {exc.returncode}", file=sys.stderr)
        return exc.returncode or 1
    except requests.RequestException as exc:
        print(f"ERROR: HTTP request failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
