const state = {     step: 1,     template: 'modern',     experienceCount: 0,     educationCount: 0,     skillCount: 0,     langCount: 0 };   const progress = document.getElementById('progress'); const sectionMenu = document.getElementById('section-menu');   function goStep(step) {     state.step = Number(step);     document.querySelectorAll('.step-panel').forEach(panel => {         panel.classList.toggle('active', Number(panel.dataset.panel) === state.step);     });     document.querySelectorAll('.step-nav-item').forEach(btn => {         btn.classList.toggle('active', Number(btn.dataset.step) === state.step);     });     progress.style.width = `${state.step * 33.333}%`;     sectionMenu.classList.toggle('show', state.step === 2);     window.scrollTo({ top: 0, behavior: 'smooth' }); }   document.querySelectorAll('[data-next]').forEach(btn => {     btn.addEventListener('click', () => goStep(btn.dataset.next)); });   document.querySelectorAll('[data-prev]').forEach(btn => {     btn.addEventListener('click', () => goStep(btn.dataset.prev)); });   document.querySelectorAll('.step-nav-item').forEach(btn => {     btn.addEventListener('click', () => goStep(btn.dataset.step)); });   document.querySelectorAll('.section-menu button').forEach(btn => {     btn.addEventListener('click', () => {         document.querySelectorAll('.section-menu button').forEach(b => b.classList.remove('active'));         btn.classList.add('active');         document.getElementById(btn.dataset.section).scrollIntoView({ behavior: 'smooth', block: 'start' });     }); });   document.querySelectorAll('.template-card').forEach(card => {     card.addEventListener('click', () => {         document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));         card.classList.add('selected');         state.template = card.dataset.template;     }); });   function addExperience() {     state.experienceCount += 1;     const wrap = document.createElement('div');     wrap.className = 'entry-card';     wrap.innerHTML = `         <div class="entry-head">             <strong>Zamestnanie ${state.experienceCount}</strong>             <button class="remove-entry" type="button" onclick="this.closest('.entry-card').remove();"><i class="fa-solid fa-trash"></i></button>         </div>         <div class="field-grid">
            <div class="field"><label>Názov pracovnej pozície</label><input class="cv-input js-exp-title" placeholder="Napr. Predavač"></div>
            <div class="field"><label>Zamestnávateľ</label><input class="cv-input js-exp-employer" placeholder="Názov firmy"></div>
            <div class="field full"><label>Mesto/obec - Slovensko <small>(Zmeniť štát)</small></label><input class="cv-input js-exp-city" placeholder="napríklad Bratislava"></div>
            <label class="check-row full"><input class="js-exp-current" type="checkbox"> Aktuálne tu pracujem</label>
            <div class="field full">
                <label>Časové obdobie</label>
                <div class="period-row">
                    <input class="cv-input js-exp-from-year" placeholder="Od: Rok">
                    <select class="cv-select js-exp-from-month"><option>Mesiac</option><option>Január</option><option>Február</option><option>Marec</option></select>
                    <input class="cv-input js-exp-to-year" placeholder="Do: Rok">
                    <select class="cv-select js-exp-to-month"><option>Mesiac</option><option>Január</option><option>Február</option><option>Marec</option></select>
                </div>
            </div>
            <div class="field full"><label>Popis práce (nepovinné)</label><textarea class="cv-textarea js-exp-description" placeholder="Krátko a výstižne popíšte vašu náplň práce"></textarea></div>
        </div>
    `;
    document.getElementById('experience-list').appendChild(wrap); }   function educationMarkup(type) {
    if (type === 'secondary') {
        return `
            <div class="field full"><label>Stredná škola</label><input class="cv-input js-edu-title" placeholder="Názov školy"></div>
            <label class="check-row full"><input class="js-edu-maturita" type="checkbox"> Ukončená s maturitnou skúškou</label>
        `;
    }
    if (type === 'course') {
        return `
            <div class="field"><label>Názov kurzu/školenia alebo certifikátu</label><input class="cv-input js-edu-title" placeholder="Názov kurzu"></div>
            <div class="field"><label>Názov inštitúcie</label><input class="cv-input js-edu-institution" placeholder="Inštitúcia"></div>
        `;
    }
    return `
        <div class="field"><label>Vysoká škola</label><input class="cv-input js-edu-title" placeholder="Názov školy"></div>
        <div class="field"><label>Odbor</label><input class="cv-input js-edu-field" placeholder="Odbor"></div>
    `;
}
 function yearOptions(includeUnfinished) {
    let options = includeUnfinished ? '<option value="Neukončené"></option>' : '';
    for (let year = new Date().getFullYear(); year >= 1970; year -= 1) {
        options += `<option value="${year}"></option>`;
    }
    return options;
}
 function setEducationType(card, type) {
    card.dataset.type = type;
    const educationId = card.dataset.educationId;
    const startListId = `education-start-year-${educationId}`;
    const endListId = `education-end-year-${educationId}`;
    card.querySelectorAll('.edu-choice').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.edu === type);
    });
    card.querySelector('.education-body').innerHTML = `
        <div class="field-grid">
            ${educationMarkup(type)}
            <div class="field full">
                <label>Časové obdobie</label>
                <div class="education-year-row">
                    <input class="cv-input js-edu-from-year" list="${startListId}" placeholder="Od: Rok">
                    <datalist id="${startListId}">
                        ${yearOptions(false)}
                    </datalist>
                    <input class="cv-input js-edu-to-year" list="${endListId}" placeholder="Do: Rok">
                    <datalist id="${endListId}">
                        ${yearOptions(true)}
                    </datalist>
                </div>
            </div>
            <div class="field full"><label>Popis štúdia (nepovinné)</label><textarea class="cv-textarea js-edu-description" placeholder="Krátko a výstižne popíšte vaše štúdium"></textarea></div>
        </div>
    `;
}
  function addEducation() {
    state.educationCount += 1;
    const wrap = document.createElement('div');
    wrap.className = 'entry-card';
    wrap.dataset.educationId = String(state.educationCount);
    wrap.innerHTML = `
        <div class="entry-head">
            <strong>Vzdelanie ${state.educationCount}</strong>
            <button class="remove-entry" type="button" onclick="this.closest('.entry-card').remove();"><i class="fa-solid fa-trash"></i></button>         </div>         <div class="field full" style="margin-bottom: 16px;">             <label>Aké vzdelanie chcete pridať?</label>             <div class="choice-row" style="margin-top: 10px;">                 <button class="choice edu-choice active" type="button" data-edu="college">Vysoká škola</button>                 <button class="choice edu-choice" type="button" data-edu="secondary">Stredná škola</button>                 <button class="choice edu-choice" type="button" data-edu="course">Kurz alebo certifikát</button>             </div>         </div>         <div class="education-body"></div>     `;     document.getElementById('education-list').appendChild(wrap);     wrap.querySelectorAll('.edu-choice').forEach(btn => {         btn.addEventListener('click', () => {             setEducationType(wrap, btn.dataset.edu);         });     });     setEducationType(wrap, 'college'); }   function addSkill() {     state.skillCount += 1;     const wrap = document.createElement('div');     wrap.className = 'entry-card';     wrap.innerHTML = `         <div class="entry-head">             <strong>Znalosť ${state.skillCount}</strong>             <button class="remove-entry" type="button" onclick="this.closest('.entry-card').remove();"><i class="fa-solid fa-trash"></i></button>         </div>         <div class="field-grid">
            <div class="field"><label>Začnite písať</label><input class="cv-input js-skill" placeholder="Napr. Excel, komunikácia, vedenie vozidla"></div>
            <div class="field"><label>Úroveň</label><select class="cv-select js-skill-level"><option>Mierne pokročilý</option><option>Začiatočník</option><option>Pokročilý</option><option>Expert</option></select></div>
        </div>
    `;
    document.getElementById('skills-list').appendChild(wrap); }   function addLanguage() {     state.langCount += 1;     const wrap = document.createElement('div');     wrap.className = 'entry-card';     wrap.innerHTML = `         <div class="entry-head">             <strong>Jazyk ${state.langCount}</strong>             <button class="remove-entry" type="button" onclick="this.closest('.entry-card').remove();"><i class="fa-solid fa-trash"></i></button>         </div>         <div class="field-grid">
            <div class="field"><label>Začnite písať</label><input class="cv-input js-language-name" placeholder="Napr. Angličtina"></div>
            <div class="field"><label>Úroveň</label><select class="cv-select js-language-level"><option>Mierne pokročilý (B1)</option><option>Začiatočník (A1)</option><option>Pokročilý (B2)</option><option>Expert (C1/C2)</option></select></div>
        </div>
    `;
    document.getElementById('languages-list').appendChild(wrap); }   document.querySelectorAll('.license').forEach(btn => {     btn.addEventListener('click', () => btn.classList.toggle('active')); });   document.querySelectorAll('.multi-choice .choice').forEach(btn => {     btn.addEventListener('click', () => btn.classList.toggle('active')); });   document.querySelectorAll('.single-choice .choice').forEach(btn => {     btn.addEventListener('click', () => {         btn.closest('.single-choice').querySelectorAll('.choice').forEach(b => b.classList.remove('active'));         btn.classList.add('active');     }); });   document.querySelectorAll('.js-count').forEach(area => {     area.addEventListener('input', () => {         document.getElementById(area.dataset.counter).textContent = area.value.length;     }); });   const drop = document.getElementById('photo-drop');
const photoInput = document.getElementById('photo-input');
const photoPreview = document.getElementById('photo-preview');
const copyProfilePhotoBtn = document.getElementById('copy-profile-photo');
const previewCvBtn = document.getElementById('preview-cv-btn');
const downloadCvBtn = document.getElementById('download-cv-btn');
 function setPhotoSource(src) {
    if (!src) return;
    photoPreview.src = src;
    photoPreview.style.display = 'block';
}
 function handlePhoto(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
        setPhotoSource(e.target.result);
    };
    reader.readAsDataURL(file);
}
 photoInput.addEventListener('change', () => handlePhoto(photoInput.files[0]));
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag'); }); drop.addEventListener('dragleave', () => drop.classList.remove('drag')); drop.addEventListener('drop', e => {     e.preventDefault();
    drop.classList.remove('drag');
    handlePhoto(e.dataTransfer.files[0]);
});
 copyProfilePhotoBtn.addEventListener('click', () => {
    const companyData = localStorage.getItem('jobbie_company');
    let profilePhoto = localStorage.getItem('jobbie_profile_photo') || localStorage.getItem('profile_photo');
     if (!profilePhoto && companyData) {
        try {
            const parsed = JSON.parse(companyData);
            profilePhoto = parsed.thumbnail || '';
        } catch (error) {
            profilePhoto = '';
        }
    }
     if (!profilePhoto) {
        window.alert('Profilový obrázok sa zatiaľ nenašiel.');
        return;
    }
     setPhotoSource(profilePhoto);
});
 function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
 function formatMultiline(value) {
    return escapeHtml(value).replace(/\n/g, '<br>');
}
 function collectCvData() {
    const titlePrefix = document.querySelector('.js-title-prefix')?.value.trim() || '';
    const titleSuffix = document.querySelector('.js-title-suffix')?.value.trim() || '';
    const firstName = document.querySelector('.js-name')?.value.trim() || '';
    const lastName = document.querySelector('.js-surname')?.value.trim() || '';
    const fullName = [titlePrefix, firstName, lastName].filter(Boolean).join(' ') + (titleSuffix ? `, ${titleSuffix}` : '');
     const experiences = Array.from(document.querySelectorAll('#experience-list .entry-card')).map(card => ({
        title: card.querySelector('.js-exp-title')?.value.trim() || '',
        employer: card.querySelector('.js-exp-employer')?.value.trim() || '',
        city: card.querySelector('.js-exp-city')?.value.trim() || '',
        current: Boolean(card.querySelector('.js-exp-current')?.checked),
        fromYear: card.querySelector('.js-exp-from-year')?.value.trim() || '',
        fromMonth: card.querySelector('.js-exp-from-month')?.value.trim() || '',
        toYear: card.querySelector('.js-exp-to-year')?.value.trim() || '',
        toMonth: card.querySelector('.js-exp-to-month')?.value.trim() || '',
        description: card.querySelector('.js-exp-description')?.value.trim() || ''
    })).filter(item => item.title || item.employer || item.description);
     const education = Array.from(document.querySelectorAll('#education-list .entry-card')).map(card => ({
        type: card.dataset.type || 'college',
        title: card.querySelector('.js-edu-title')?.value.trim() || '',
        field: card.querySelector('.js-edu-field')?.value.trim() || '',
        institution: card.querySelector('.js-edu-institution')?.value.trim() || '',
        maturita: Boolean(card.querySelector('.js-edu-maturita')?.checked),
        fromYear: card.querySelector('.js-edu-from-year')?.value.trim() || '',
        toYear: card.querySelector('.js-edu-to-year')?.value.trim() || '',
        description: card.querySelector('.js-edu-description')?.value.trim() || ''
    })).filter(item => item.title || item.field || item.institution || item.description);
     const skills = Array.from(document.querySelectorAll('#skills-list .entry-card')).map(card => ({
        name: card.querySelector('.js-skill')?.value.trim() || '',
        level: card.querySelector('.js-skill-level')?.value.trim() || ''
    })).filter(item => item.name);
     const languages = Array.from(document.querySelectorAll('#languages-list .entry-card')).map(card => ({
        name: card.querySelector('.js-language-name')?.value.trim() || '',
        level: card.querySelector('.js-language-level')?.value.trim() || ''
    })).filter(item => item.name);
     return {
        template: state.template,
        titlePrefix,
        titleSuffix,
        firstName,
        lastName,
        fullName: fullName.trim() || 'Meno Priezvisko',
        gender: document.querySelector('.js-gender')?.value.trim() || '',
        birthDate: document.querySelector('.js-birth-date')?.value.trim() || '',
        email: document.querySelector('.js-email')?.value.trim() || '',
        phone: document.querySelector('.js-phone')?.value.trim() || '',
        city: document.querySelector('.js-city')?.value.trim() || '',
        summary: document.querySelector('.js-summary')?.value.trim() || '',
        hobbies: document.querySelector('.js-hobbies')?.value.trim() || '',
        extraInfo: document.querySelector('.js-extra-info')?.value.trim() || '',
        salaryAmount: document.querySelector('.js-salary-amount')?.value.trim() || '',
        salaryUnit: document.querySelector('.js-salary-unit')?.value.trim() || '',
        workTypes: Array.from(document.querySelectorAll('.multi-choice .choice.active')).map(btn => btn.textContent.trim()),
        startTerm: document.querySelector('.single-choice .choice.active')?.textContent.trim() || '',
        drivingLicenses: Array.from(document.querySelectorAll('.license.active')).map(btn => btn.textContent.trim()),
        profilePhoto: photoPreview.style.display === 'block' ? photoPreview.src : '',
        experiences,
        education,
        skills,
        languages
    };
}
 function renderItems(items, renderItem, emptyText) {
    if (!items.length) {
        return `<p class="cv-empty">${escapeHtml(emptyText)}</p>`;
    }
    return items.map(renderItem).join('');
}
 function buildCvDocument(data) {
    const theme = {
        modern: { accent: '#22c55e', accentDark: '#15803d', soft: '#eefbf2', softAlt: '#dff6e7' },
        editorial: { accent: '#c2954d', accentDark: '#8a5a00', soft: '#f6efe4', softAlt: '#ead8b8' },
        professional: { accent: '#1e3a8a', accentDark: '#0f172a', soft: '#eef2ff', softAlt: '#dbe7ff' },
        compact: { accent: '#ff6b4d', accentDark: '#c2410c', soft: '#fff1eb', softAlt: '#ffd7cb' }
    }[data.template] || { accent: '#22c55e', accentDark: '#15803d', soft: '#eefbf2', softAlt: '#dff6e7' };
     const contactBits = [data.email, data.phone, data.city, data.birthDate].filter(Boolean);
    const metaHtml = contactBits.length
        ? contactBits.map(bit => `<span class="cv-meta-pill">${escapeHtml(bit)}</span>`).join('')
        : '<span class="cv-meta-pill">Doplňte kontaktné údaje</span>';
     const skillsHtml = renderItems(
        data.skills,
        skill => `<span class="cv-tag">${escapeHtml(skill.name)}${skill.level ? ` · ${escapeHtml(skill.level)}` : ''}</span>`,
        'Zručnosti zatiaľ neboli doplnené.'
    );
     const languagesHtml = renderItems(
        data.languages,
        lang => `<div class="cv-list-row"><strong>${escapeHtml(lang.name)}</strong><span>${escapeHtml(lang.level)}</span></div>`,
        'Jazyky zatiaľ neboli doplnené.'
    );
     const educationHtml = renderItems(
        data.education,
        item => {
            const typeLabel = item.type === 'secondary' ? 'Stredná škola' : item.type === 'course' ? 'Kurz / certifikát' : 'Vysoká škola';
            const period = [item.fromYear, item.toYear].filter(Boolean).join(' - ');
            const detail = item.field || item.institution || (item.maturita ? 'Ukončená s maturitnou skúškou' : '');
            return `
                <div class="cv-entry">
                    <div class="cv-entry-head">
                        <div>
                            <h4>${escapeHtml(item.title || typeLabel)}</h4>
                            <div class="cv-entry-sub">${escapeHtml(detail || typeLabel)}</div>
                        </div>
                        ${period ? `<div class="cv-entry-date">${escapeHtml(period)}</div>` : ''}
                    </div>
                    ${item.description ? `<p>${formatMultiline(item.description)}</p>` : ''}
                </div>
            `;
        },
        'Vzdelanie zatiaľ nebolo doplnené.'
    );
     const experienceHtml = renderItems(
        data.experiences,
        item => {
            const periodStart = [item.fromMonth, item.fromYear].filter(Boolean).join(' ');
            const periodEnd = item.current ? 'Súčasnosť' : [item.toMonth, item.toYear].filter(Boolean).join(' ');
            const period = [periodStart, periodEnd].filter(Boolean).join(' - ');
            const sub = [item.employer, item.city].filter(Boolean).join(' · ');
            return `
                <div class="cv-entry">
                    <div class="cv-entry-head">
                        <div>
                            <h4>${escapeHtml(item.title || 'Pracovná skúsenosť')}</h4>
                            ${sub ? `<div class="cv-entry-sub">${escapeHtml(sub)}</div>` : ''}
                        </div>
                        ${period ? `<div class="cv-entry-date">${escapeHtml(period)}</div>` : ''}
                    </div>
                    ${item.description ? `<p>${formatMultiline(item.description)}</p>` : ''}
                </div>
            `;
        },
        'Pracovné skúsenosti zatiaľ neboli doplnené.'
    );
     const extraSections = [
        data.hobbies ? `<section class="cv-section"><h3>Záujmy</h3><p>${formatMultiline(data.hobbies)}</p></section>` : '',
        data.drivingLicenses.length ? `<section class="cv-section"><h3>Vodičský preukaz</h3><div class="cv-tags">${data.drivingLicenses.map(item => `<span class="cv-tag">${escapeHtml(item)}</span>`).join('')}</div></section>` : '',
        data.extraInfo ? `<section class="cv-section"><h3>Doplňujúce informácie</h3><p>${formatMultiline(data.extraInfo)}</p></section>` : ''
    ].join('');
     const summaryHtml = data.summary ? `<p class="cv-summary">${formatMultiline(data.summary)}</p>` : '';
    const preferencesHtml = (data.workTypes.length || data.startTerm || data.salaryAmount)
        ? `
            <section class="cv-section">
                <h3>Preferencie</h3>
                <div class="cv-preferences">
                    ${data.workTypes.length ? `<div><strong>Typ úväzku:</strong> ${escapeHtml(data.workTypes.join(', '))}</div>` : ''}
                    ${data.startTerm ? `<div><strong>Nástup:</strong> ${escapeHtml(data.startTerm)}</div>` : ''}
                    ${data.salaryAmount ? `<div><strong>Plat:</strong> ${escapeHtml(data.salaryAmount)} EUR ${escapeHtml(data.salaryUnit)}</div>` : ''}
                </div>
            </section>
        `
        : '';
     let layoutClass = 'cv-layout-modern';
    let headerClass = 'cv-header-modern';
    if (data.template === 'editorial') {
        layoutClass = 'cv-layout-editorial';
        headerClass = 'cv-header-editorial';
    } else if (data.template === 'professional') {
        layoutClass = 'cv-layout-professional';
        headerClass = 'cv-header-professional';
    } else if (data.template === 'compact') {
        layoutClass = 'cv-layout-compact';
        headerClass = 'cv-header-compact';
    }
     return `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(data.fullName)} - CV</title>
<style>
    :root {
--accent: ${theme.accent};
--accent-dark: ${theme.accentDark};
--soft: ${theme.soft};
--soft-alt: ${theme.softAlt};
--text: #111111;
--muted: rgba(17,17,17,0.64);
--line: rgba(17,17,17,0.08);
    }
    * { box-sizing: border-box; }
    body {
margin: 0;
background: #e9f4eb;
font-family: "DM Sans", Arial, sans-serif;
color: var(--text);
padding: 28px;
    }
    .cv-page-export {
width: 210mm;
min-height: 297mm;
margin: 0 auto;
background: #ffffff;
box-shadow: 0 10px 28px rgba(0,0,0,0.12);
overflow: hidden;
    }
    .cv-header-modern,
    .cv-header-editorial,
    .cv-header-compact {
padding: 34px 38px;
color: #ffffff;
background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%);
    }
    .cv-header-editorial {
color: #2b1700;
background: linear-gradient(135deg, var(--soft-alt) 0%, var(--accent) 100%);
    }
    .cv-header-professional {
padding: 0;
display: grid;
grid-template-columns: 34% 1fr;
    }
    .cv-header-professional .cv-side-rail {
background: linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%);
color: #ffffff;
padding: 36px 28px;
    }
    .cv-header-professional .cv-main-head {
padding: 36px 38px;
background: #ffffff;
    }
    .cv-header-compact {
padding: 28px 34px;
    }
    .cv-head-row {
display: flex;
gap: 22px;
align-items: center;
    }
    .cv-photo {
width: 104px;
height: 104px;
border-radius: 50%;
overflow: hidden;
background: rgba(255,255,255,0.2);
border: 4px solid rgba(255,255,255,0.65);
flex-shrink: 0;
display: flex;
align-items: center;
justify-content: center;
font-size: 34px;
font-weight: 900;
    }
    .cv-photo img { width: 100%; height: 100%; object-fit: cover; }
    .cv-name {
margin: 0;
font-size: 38px;
line-height: 1.02;
font-weight: 900;
    }
    .cv-summary {
margin: 16px 0 0;
font-size: 17px;
line-height: 1.6;
    }
    .cv-meta {
margin-top: 16px;
display: flex;
flex-wrap: wrap;
gap: 8px;
    }
    .cv-meta-pill {
background: rgba(255,255,255,0.18);
border-radius: 999px;
padding: 8px 12px;
font-size: 13px;
font-weight: 700;
    }
    .cv-header-editorial .cv-meta-pill,
    .cv-header-professional .cv-main-head .cv-meta-pill {
background: var(--soft);
color: var(--accent-dark);
    }
    .cv-layout-modern,
    .cv-layout-editorial,
    .cv-layout-compact {
padding: 32px 38px 40px;
display: grid;
gap: 24px;
    }
    .cv-layout-editorial {
grid-template-columns: 1fr 1fr;
gap: 24px 28px;
    }
    .cv-layout-professional {
display: grid;
grid-template-columns: 34% 1fr;
    }
    .cv-layout-professional .cv-side-rail {
background: var(--accent-dark);
color: #ffffff;
padding: 30px 28px 40px;
display: grid;
gap: 22px;
    }
    .cv-layout-professional .cv-main-content {
padding: 30px 38px 40px;
display: grid;
gap: 24px;
    }
    .cv-section {
display: grid;
gap: 12px;
    }
    .cv-section h3 {
margin: 0;
font-size: 15px;
text-transform: uppercase;
letter-spacing: 0.08em;
color: var(--accent-dark);
font-weight: 900;
    }
    .cv-layout-professional .cv-side-rail .cv-section h3,
    .cv-layout-professional .cv-side-rail p,
    .cv-layout-professional .cv-side-rail .cv-list-row,
    .cv-layout-professional .cv-side-rail .cv-tag {
color: #ffffff;
    }
    .cv-layout-professional .cv-side-rail .cv-tag {
background: rgba(255,255,255,0.12);
border-color: rgba(255,255,255,0.14);
    }
    .cv-layout-professional .cv-side-rail .cv-list-row {
border-bottom-color: rgba(255,255,255,0.12);
    }
    .cv-entry {
padding-bottom: 16px;
border-bottom: 1px solid var(--line);
    }
    .cv-entry:last-child { padding-bottom: 0; border-bottom: none; }
    .cv-entry-head {
display: flex;
justify-content: space-between;
gap: 16px;
align-items: flex-start;
margin-bottom: 6px;
    }
    .cv-entry h4 {
margin: 0;
font-size: 20px;
line-height: 1.2;
font-weight: 800;
    }
    .cv-entry-sub,
    .cv-entry-date,
    .cv-section p,
    .cv-preferences div {
font-size: 15px;
line-height: 1.6;
color: var(--muted);
    }
    .cv-tags {
display: flex;
flex-wrap: wrap;
gap: 8px;
    }
    .cv-tag {
padding: 8px 12px;
border-radius: 999px;
background: var(--soft);
border: 1px solid rgba(17,17,17,0.05);
font-size: 13px;
font-weight: 700;
color: var(--text);
    }
    .cv-list-row {
display: flex;
justify-content: space-between;
gap: 14px;
padding: 10px 0;
border-bottom: 1px solid var(--line);
font-size: 15px;
    }
    .cv-list-row:last-child { border-bottom: none; }
    .cv-empty { margin: 0; color: var(--muted); font-size: 15px; }
    .cv-preferences {
display: grid;
gap: 8px;
    }
    @page { size: A4; margin: 12mm; }
    @media print {
body { background: #ffffff; padding: 0; }
.cv-page-export { width: 100%; min-height: auto; box-shadow: none; }
    }
</style>
</head>
<body>
    <div class="cv-page-export">
${data.template === 'professional' ? `
    <div class="cv-header-professional">
        <div class="cv-side-rail">
            ${data.profilePhoto ? `<div class="cv-photo"><img src="${data.profilePhoto}" alt=""></div>` : ''}
            <div class="cv-section">
                <h3>Kontakt</h3>
                <div class="cv-tags">${metaHtml}</div>
            </div>
            <div class="cv-section">
                <h3>Znalosti</h3>
                <div class="cv-tags">${skillsHtml}</div>
            </div>
        </div>
        <div class="cv-main-head">
            <h1 class="cv-name">${escapeHtml(data.fullName)}</h1>
            ${summaryHtml}
        </div>
    </div>
    <div class="cv-layout-professional">
        <div class="cv-side-rail">
            <section class="cv-section">
                <h3>Jazyky</h3>
                ${languagesHtml}
            </section>
            ${data.drivingLicenses.length ? `<section class="cv-section"><h3>Vodičský preukaz</h3><div class="cv-tags">${data.drivingLicenses.map(item => `<span class="cv-tag">${escapeHtml(item)}</span>`).join('')}</div></section>` : ''}
            ${data.hobbies ? `<section class="cv-section"><h3>Záujmy</h3><p>${formatMultiline(data.hobbies)}</p></section>` : ''}
        </div>
        <div class="cv-main-content">
            <section class="cv-section"><h3>Pracovné skúsenosti</h3>${experienceHtml}</section>
            <section class="cv-section"><h3>Vzdelanie</h3>${educationHtml}</section>
            ${preferencesHtml}
            ${data.extraInfo ? `<section class="cv-section"><h3>Doplňujúce informácie</h3><p>${formatMultiline(data.extraInfo)}</p></section>` : ''}
        </div>
    </div>
` : `
    <div class="${headerClass}">
        <div class="cv-head-row">
            <div class="cv-photo">${data.profilePhoto ? `<img src="${data.profilePhoto}" alt="">` : escapeHtml((data.firstName[0] || 'J') + (data.lastName[0] || 'B'))}</div>
            <div>
                <h1 class="cv-name">${escapeHtml(data.fullName)}</h1>
                ${summaryHtml}
                <div class="cv-meta">${metaHtml}</div>
            </div>
        </div>
    </div>
    <div class="${layoutClass}">
        <section class="cv-section"><h3>Pracovné skúsenosti</h3>${experienceHtml}</section>
        <section class="cv-section"><h3>Vzdelanie</h3>${educationHtml}</section>
        <section class="cv-section"><h3>Znalosti</h3><div class="cv-tags">${skillsHtml}</div></section>
        <section class="cv-section"><h3>Jazyky</h3>${languagesHtml}</section>
        ${preferencesHtml}
        ${extraSections}
    </div>
`}
    </div>
</body>
</html>`;
}
function getSafeCvFileName(fullName) {
    return (fullName || 'jobbie-cv')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'jobbie-cv';
}

function openCvPreview() {
    const html = buildCvDocument(collectCvData());
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
        window.alert('Náhľad sa nepodarilo otvoriť. Skontrolujte blokovanie vyskakovacích okien.');
        return;
    }
    previewWindow.document.open();
    previewWindow.document.write(html);
    previewWindow.document.close();
}

function ensureHtml2Pdf() {
    if (window.html2pdf) {
        return Promise.resolve(window.html2pdf);
    }

    const existing = document.getElementById('html2pdf-lib');
    if (existing) {
        return new Promise((resolve, reject) => {
            existing.addEventListener('load', () => resolve(window.html2pdf), { once: true });
            existing.addEventListener('error', () => reject(new Error('Nepodarilo sa načítať PDF knižnicu.')), { once: true });
        });
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = 'html2pdf-lib';
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => {
            if (window.html2pdf) {
                resolve(window.html2pdf);
                return;
            }
            reject(new Error('PDF knižnica sa načítala neúplne.'));
        };
        script.onerror = () => reject(new Error('Nepodarilo sa načítať PDF knižnicu.'));
        document.head.appendChild(script);
    });
}

function createExportFrame(html) {
    return new Promise((resolve, reject) => {
        const frame = document.createElement('iframe');
        frame.style.position = 'fixed';
        frame.style.right = '-10000px';
        frame.style.bottom = '0';
        frame.style.width = '210mm';
        frame.style.height = '297mm';
        frame.style.border = '0';
        frame.setAttribute('aria-hidden', 'true');
        document.body.appendChild(frame);

        const cleanup = () => {
            frame.remove();
        };

        const onReady = async () => {
            try {
                const frameDoc = frame.contentDocument;
                if (!frameDoc) {
                    throw new Error('Nepodarilo sa pripraviť export.');
                }

                if (frameDoc.fonts && frameDoc.fonts.ready) {
                    try {
                        await frameDoc.fonts.ready;
                    } catch (error) {
                    }
                }

                await Promise.all(Array.from(frameDoc.images).map(image => {
                    if (image.complete) {
                        return Promise.resolve();
                    }
                    return new Promise(imageResolve => {
                        image.onload = imageResolve;
                        image.onerror = imageResolve;
                    });
                }));

                resolve({ frame, cleanup });
            } catch (error) {
                cleanup();
                reject(error);
            }
        };

        frame.onload = () => {
            window.setTimeout(onReady, 60);
        };

        const frameDoc = frame.contentDocument;
        if (!frameDoc) {
            cleanup();
            reject(new Error('Nepodarilo sa otvoriť exportný dokument.'));
            return;
        }

        frameDoc.open();
        frameDoc.write(html);
        frameDoc.close();
    });
}

async function downloadCvDocument() {
    const data = collectCvData();
    const html = buildCvDocument(data);
    const safeName = getSafeCvFileName(data.fullName);
    const originalLabel = downloadCvBtn.innerHTML;
    let exportCleanup = null;

    downloadCvBtn.disabled = true;
    downloadCvBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generujem PDF';

    try {
        const html2pdf = await ensureHtml2Pdf();
        const { frame, cleanup } = await createExportFrame(html);
        exportCleanup = cleanup;
        const exportRoot = frame.contentDocument?.querySelector('.cv-page-export');

        if (!exportRoot) {
            cleanup();
            exportCleanup = null;
            throw new Error('Nepodarilo sa pripraviť šablónu pre PDF export.');
        }

        await html2pdf().set({
            margin: 0,
            filename: `${safeName}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            },
            pagebreak: { mode: ['css', 'legacy'] }
        }).from(exportRoot).save();

        cleanup();
        exportCleanup = null;
    } catch (error) {
        console.error(error);
        window.alert('PDF sa nepodarilo vygenerovať. Skontrolujte pripojenie a skúste to znova.');
    } finally {
        if (exportCleanup) {
            exportCleanup();
        }
        downloadCvBtn.disabled = false;
        downloadCvBtn.innerHTML = originalLabel;
    }
}

previewCvBtn.addEventListener('click', openCvPreview);
downloadCvBtn.addEventListener('click', () => {
    downloadCvDocument();
});
 (function initStickySidebar() {
    const sidebar = document.getElementById('cv-sidebar');
    const shell = document.querySelector('.cv-shell');
    const mobileBreakpoint = 820;
    const offset = 100;
     function updateStickySidebar() {
        if (!sidebar || !shell) return;
         if (window.innerWidth <= mobileBreakpoint) {
            sidebar.style.transform = 'none';
            return;
        }
         const shellRect = shell.getBoundingClientRect();
        const shellHeight = shell.offsetHeight;
        const sidebarHeight = sidebar.offsetHeight;
        const maxTranslate = Math.max(0, shellHeight - sidebarHeight);
        const translate = Math.min(Math.max(0, -shellRect.top + offset), maxTranslate);
         sidebar.style.transform = `translateY(${translate}px)`;
    }
     window.addEventListener('scroll', updateStickySidebar, { passive: true });
    window.addEventListener('resize', updateStickySidebar);
    updateStickySidebar();
})();
 addExperience();
addEducation();
addSkill();
addLanguage();
