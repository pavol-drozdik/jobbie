function toggleFaq(btn) {
    const item = btn.parentElement;
    const isOpen = item.classList.contains('faq-open');
    document.querySelectorAll('.faq-item.faq-open').forEach(el => el.classList.remove('faq-open'));
    if (!isOpen) item.classList.add('faq-open');
}

function initSlider(track, startOffset) {
    Array.from(track.children).forEach(card => {
        track.appendChild(card.cloneNode(true));
    });

    let originalWidth = track.scrollWidth / 2;
    let pos = startOffset % originalWidth;

    function tick() {
        pos += 0.5;
        if (pos >= originalWidth) pos -= originalWidth;
        track.style.transform = `translateX(${-pos}px)`;
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

const carouselData = {
    zamestnavatel: [
        { title: '1. Vytvor inzerát',     text: 'Zaregistruj sa a zverejni pracovnú ponuku za pár minút. Nastav požiadavky, lokalitu a hodinovú mzdu.' },
        { title: '2. Prezeraj prihlášky', text: 'Prechádzaj profily overených uchádzačov, čítaj hodnotenia a vyber toho, kto sa hodí najlepšie.' },
        { title: '3. Začni spoluprácu',   text: 'Dohodni podmienky priamo v aplikácii a obsaď svoju pozíciu do 48 hodín.' },
    ],
    brigadnik: [
        { title: '1. Nájdi brigádu',  text: 'Prezri stovky brigád podľa tvojich preferencií – podľa mesta, odvetvia alebo hodinovej mzdy.' },
        { title: '2. Prihlás sa',     text: 'Odošli prihlášku jedným kliknutím. Žiadny životopis, žiadna byrokracia.' },
        { title: '3. Začni zarábať', text: 'Nastúp na brigádu a začni zarábať hneď na druhý deň.' },
    ],
    profesional: [
        { title: '1. Vytvor profil',      text: 'Zaregistruj sa ako profesionál a pridaj svoje odborné zručnosti a referencie.' },
        { title: '2. Získaj zákazníkov',  text: 'Nechaj zákazníkov, aby ťa našli cez vyhľadávanie. Daj o sebe vedieť tisíckam ľudí.' },
        { title: '3. Spravuj zákazky',    text: 'Komunikuj so zákazníkmi priamo v aplikácii a dohodni podmienky spolupráce.' },
    ],
};

function initCarousel() {
    const track = document.querySelector('.carousel-track');
    if (!track) return;

    const container  = document.querySelector('.carousel');
    const dots       = Array.from(document.querySelectorAll('.carousel-dot'));
    const nextBtn    = document.querySelector('.carousel-next-btn');
    const backBtn    = document.querySelector('.carousel-back-btn');
    const roleItems  = Array.from(document.querySelectorAll('.role-selector > div'));
    const GAP        = 30;
    let currentIndex = 0;
    let cards        = [];

    function getOffset(index) {
        const containerWidth = container.offsetWidth;
        const cardWidth      = cards[0] ? cards[0].offsetWidth : 700;
        return (containerWidth / 2) - (cardWidth / 2) - index * (cardWidth + GAP);
    }

    function goTo(index, animate) {
        track.style.transition = animate ? 'transform 0.5s ease' : 'none';
        track.style.transform  = `translateX(${getOffset(index)}px)`;
        dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
        currentIndex = index;
    }

    function loadRole(role) {
        track.innerHTML = '';
        carouselData[role].forEach(item => {
            const card = document.createElement('div');
            card.className = 'carousel-card';
            card.innerHTML = `<h3>${item.title}</h3><p>${item.text}</p>`;
            track.appendChild(card);
        });
        cards = Array.from(track.querySelectorAll('.carousel-card'));
        // Defer so browser has computed card dimensions before we read offsetWidth
        requestAnimationFrame(() => goTo(0, false));
    }

    nextBtn.addEventListener('click', () => {
        goTo((currentIndex + 1) % cards.length, true);
    });

    backBtn.addEventListener('click', () => {
        goTo((currentIndex - 1 + cards.length) % cards.length, true);
    });

    // Touch / drag support
    let dragStartX   = 0;
    let dragDelta    = 0;
    let isDragging   = false;
    let isHorizontal = null; // determined on first move

    track.addEventListener('touchstart', e => {
        dragStartX   = e.touches[0].clientX;
        dragDelta    = 0;
        isDragging   = true;
        isHorizontal = null;
        track.style.transition = 'none';
    }, { passive: true });

    track.addEventListener('touchmove', e => {
        if (!isDragging) return;
        const dx = e.touches[0].clientX - dragStartX;
        const dy = e.touches[0].clientY - (e.touches[0].clientY); // always 0, use changedTouches diff below

        // Determine swipe axis on first move
        if (isHorizontal === null) {
            const startY = e.touches[0].clientY;
            isHorizontal = Math.abs(dx) > 8;
        }
        if (!isHorizontal) return;

        e.preventDefault();
        dragDelta = dx;
        track.style.transform = `translateX(${getOffset(currentIndex) + dragDelta}px)`;
    }, { passive: false });

    track.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        const THRESHOLD = 60;
        if (dragDelta < -THRESHOLD) {
            goTo((currentIndex + 1) % cards.length, true);
        } else if (dragDelta > THRESHOLD) {
            goTo((currentIndex - 1 + cards.length) % cards.length, true);
        } else {
            goTo(currentIndex, true); // snap back
        }
        dragDelta = 0;
    });

    roleItems.forEach(item => {
        item.addEventListener('click', () => {
            roleItems.forEach(r => r.classList.remove('selected'));
            item.classList.add('selected');
            loadRole(item.dataset.role);
        });
    });

    window.addEventListener('resize', () => goTo(currentIndex, false));

    loadRole('zamestnavatel');
}

document.addEventListener('DOMContentLoaded', () => {
    const tracks = document.querySelectorAll('.reviews-track');
    if (tracks[0]) initSlider(tracks[0], 0);
    if (tracks[1]) initSlider(tracks[1], 250);

    initCarousel();
});
