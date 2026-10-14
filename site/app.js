import { notes } from './data.js';

const $ = id => document.getElementById(id);
const PAGE_SIZE = 24;
const state = { category: '', query: '', view: 'grid', note: null, page: 0, reading: 'paged', limit: PAGE_SIZE, filterKey: '' };
const categories = [...new Set(notes.map(note => note.category).filter(Boolean))];
const dialog = $('image-dialog');
const pad = number => String(number).padStart(2, '0');
const header = document.querySelector('.site-header');
function updateHeaderDepth() {
  header.classList.toggle('is-scrolled', window.scrollY > 8);
}
window.addEventListener('scroll', updateHeaderDepth, { passive: true });
updateHeaderDepth();

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  svg.setAttribute('aria-hidden', 'true');
  use.setAttribute('href', `#${name}`);
  svg.append(use);
  return svg;
}

function setMaterialView(closeup) {
  $('brand-hero').classList.toggle('is-closeup', closeup);
  $('whole-scene').setAttribute('aria-pressed', String(!closeup));
  $('material-closeup').setAttribute('aria-pressed', String(closeup));
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function tagButton(tag) {
  const button = element('button', '', `#${tag.replace(/^#/, '')}`);
  button.type = 'button';
  button.addEventListener('click', () => {
    state.query = tag.replace(/^#/, '');
    state.category = '';
    $('search').value = state.query;
    if (state.note) location.hash = '#collection';
    renderCollection();
  });
  return button;
}

function renderNavigation() {
  $('category-navigation').replaceChildren(...['', ...categories].map(category => {
    const button = element('button');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(state.category === category));
    const count = notes.filter(note => !category || note.category === category).length;
    button.append(element('span', '', category || '全部构想'), element('span', '', String(count)));
    button.addEventListener('click', () => {
      state.category = category;
      state.query = '';
      $('search').value = '';
      if (state.note) location.hash = '#collection';
      renderCollection();
    });
    return button;
  }));
}

function renderCollection() {
  renderNavigation();
  const query = state.query.trim().toLocaleLowerCase();
  const filterKey = JSON.stringify([state.category, query]);
  if (state.filterKey !== filterKey) { state.limit = PAGE_SIZE; state.filterKey = filterKey; }
  const matches = notes.filter(note => (!state.category || note.category === state.category) && (!query || [note.title, note.body, ...note.tags].join(' ').toLocaleLowerCase().includes(query)));
  const visible = matches.slice(0, state.limit);
  $('total-count').textContent = String(notes.length);
  $('result-count').textContent = query ? `“${state.query.trim()}” · 找到 ${matches.length} 篇构想` : state.category ? `${state.category} · ${matches.length} 篇构想` : '';
  $('empty-state').hidden = matches.length > 0;
  $('content-grid').classList.toggle('list', state.view === 'list');
  $('grid-view').setAttribute('aria-pressed', String(state.view === 'grid'));
  $('list-view').setAttribute('aria-pressed', String(state.view === 'list'));
  $('content-grid').replaceChildren(...visible.map(note => {
    const article = element('article', 'content-card');
    const cover = element('a', 'cover');
    cover.href = `#/note/${note.id}`;
    cover.setAttribute('aria-label', `阅读：${note.title}`);
    if (note.images.length) {
      const image = element('img');
      image.src = note.cover || note.images[0];
      image.alt = `${note.title}封面`;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.width = note.imageDimensions?.[0]?.width || 1080;
      image.height = note.imageDimensions?.[0]?.height || 1440;
      cover.append(image, element('span', 'cover-count', `${note.images.length} 张`));
    } else {
      cover.classList.add('text-cover');
      cover.append(element('span', 'text-cover-label', note.category), element('p', '', note.title), element('span', 'cover-count', '文章'));
    }
    const copy = element('div', 'card-copy');
    const heading = element('h2');
    const link = element('a', '', note.title);
    link.href = cover.href;
    link.append(icon('arrow'));
    heading.append(link);
    const tags = element('div', 'card-tags');
    tags.append(...note.tags.slice(0, 3).map(tagButton));
    copy.append(element('span', 'card-category', note.category || '生活观察'), heading, element('p', '', note.excerpt), tags);
    article.append(cover, copy);
    return article;
  }));
  $('load-more').hidden = visible.length === matches.length;
  $('collection-position').textContent = matches.length ? `已显示 ${visible.length} / ${matches.length} 篇` : '';
}

function renderImage() {
  if (!state.note?.images.length) return;
  const { images, title } = state.note;
  const alt = `${title} · 第 ${state.page + 1} 张`;
  for (const [id, container] of [['main-image', 'image-button'], ['full-image', 'full-image-container']]) {
    const image = $(id) || element('img');
    image.id = id;
    image.src = images[state.page];
    image.alt = alt;
    if (!image.isConnected) $(container).append(image);
  }
  $('page-position').textContent = `${pad(state.page + 1)} / ${pad(images.length)}`;
  $('dialog-position').textContent = $('page-position').textContent;
  for (const id of ['previous', 'dialog-prev']) $(id).disabled = state.page === 0;
  for (const id of ['next', 'dialog-next']) $(id).disabled = state.page === images.length - 1;
  [...$('filmstrip').children].forEach((button, index) => button.setAttribute('aria-pressed', String(index === state.page)));
}

function movePage(delta) {
  if (!state.note) return;
  state.page = Math.max(0, Math.min(state.note.images.length - 1, state.page + delta));
  renderImage();
  $('filmstrip').children[state.page]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (dialog.open) dialog.querySelector('.dialog-image').scrollTop = 0;
}

function setReading(mode) {
  state.reading = mode;
  $('paged-gallery').hidden = mode !== 'paged';
  $('continuous-gallery').hidden = mode !== 'continuous';
  $('paged-view').setAttribute('aria-pressed', String(mode === 'paged'));
  $('continuous-view').setAttribute('aria-pressed', String(mode === 'continuous'));
  document.querySelector('.gallery-column').style.position = mode === 'continuous' ? 'static' : '';
}

function renderDetail(note) {
  state.note = note;
  state.page = 0;
  $('detail-category').textContent = note.category || '生活观察';
  $('detail-title').textContent = note.title;
  $('detail-body').textContent = note.body;
  $('image-count').textContent = `${note.images.length} 张图片`;
  $('dialog-caption').textContent = note.title;
  $('detail-tags').replaceChildren(...note.tags.map(tagButton));
  const hasImages = note.images.length > 0;
  document.querySelector('.gallery-column').hidden = !hasImages;
  document.querySelector('.detail-layout').classList.toggle('text-article', !hasImages);
  $('image-count').hidden = !hasImages;
  $('content-format').textContent = hasImages ? '图文内容' : '文字文章';
  $('filmstrip').replaceChildren(...note.images.map((src, index) => {
    const button = element('button');
    button.type = 'button';
    button.setAttribute('aria-label', `查看第 ${index + 1} 张图片`);
    const image = element('img');
    image.src = note.thumbnails?.[index] || src;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    button.append(image, element('span', '', pad(index + 1)));
    button.addEventListener('click', () => { state.page = index; renderImage(); });
    return button;
  }));
  $('continuous-gallery').replaceChildren();
  setReading('paged');
  renderImage();
}

function renderContinuous() {
  const note = state.note;
  if (!note || $('continuous-gallery').children.length) return;
  $('continuous-gallery').replaceChildren(...note.images.map((src, index) => {
    const image = element('img');
    image.src = src;
    image.alt = `${note.title} · 第 ${index + 1} 张`;
    image.width = note.imageDimensions?.[index]?.width || 1080;
    image.height = note.imageDimensions?.[index]?.height || 1440;
    image.loading = 'lazy';
    return image;
  }));
}

function route() {
  renderNavigation();
  const id = location.hash.startsWith('#/note/') ? location.hash.slice('#/note/'.length) : '';
  const note = notes.find(item => item.id === id);
  if (dialog.open) dialog.close();
  $('explore').hidden = Boolean(note);
  $('detail').hidden = !note;
  $('breadcrumb-current').textContent = note ? '阅读' : '探索';
  document.title = note ? `${note.title} · 生活构想` : '生活构想 · 空间、材料与产品';
  if (note) renderDetail(note);
  else { state.note = null; renderCollection(); }
  const anchor = location.hash === '#collection' ? $('collection') : location.hash === '#about' ? $('about') : null;
  if (anchor) anchor.scrollIntoView({ block: 'start' });
  else window.scrollTo({ top: 0, behavior: 'instant' });
}

function openImage() {
  if (!state.note?.images.length) return;
  dialog.showModal();
  document.documentElement.style.overflow = 'hidden';
  dialog.querySelector('.dialog-image').scrollTop = 0;
}

$('image-button').addEventListener('click', openImage);
$('expand-image').addEventListener('click', openImage);
$('close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { document.documentElement.style.overflow = ''; });
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
for (const id of ['previous', 'dialog-prev']) $(id).addEventListener('click', () => movePage(-1));
for (const id of ['next', 'dialog-next']) $(id).addEventListener('click', () => movePage(1));
$('paged-view').addEventListener('click', () => setReading('paged'));
$('continuous-view').addEventListener('click', () => { renderContinuous(); setReading('continuous'); });
$('load-more').addEventListener('click', () => {
  const firstNew = $('content-grid').children.length;
  state.limit += PAGE_SIZE;
  renderCollection();
  const cover = $('content-grid').children[firstNew]?.querySelector('.cover');
  cover?.focus({ preventScroll: true });
  cover?.scrollIntoView({ block: 'start' });
});
for (const view of ['grid', 'list']) $(`${view}-view`).addEventListener('click', () => { state.view = view; renderCollection(); });
$('reset').addEventListener('click', () => {
  state.query = '';
  state.category = '';
  $('search').value = '';
  renderCollection();
});
document.querySelector('.search').addEventListener('submit', event => event.preventDefault());
$('search').addEventListener('input', event => {
  state.query = event.target.value;
  if (state.note) location.hash = '#collection';
  renderCollection();
});
document.addEventListener('keydown', event => {
  const editing = event.target instanceof Element && event.target.matches('input,textarea,[contenteditable=true]');
  if (editing) return;
  if (event.key === '/' && !dialog.open) {
    event.preventDefault();
    if (state.note) {
      location.hash = '#collection';
      requestAnimationFrame(() => $('search').focus());
    } else $('search').focus();
  }
  if (state.note && (dialog.open || state.reading === 'paged')) {
    if (event.key === 'ArrowLeft') { event.preventDefault(); movePage(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); movePage(1); }
  }
});
$('whole-scene').addEventListener('click', () => setMaterialView(false));
$('material-closeup').addEventListener('click', () => setMaterialView(true));
window.addEventListener('hashchange', route);
route();
