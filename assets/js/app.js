/* ==========================================================================
   ARTE XUKURU DO ORORUBÁ - APLICAÇÃO JAVASCRIPT PRINCIPAL
   Disposição do Catálogo e Carrinho (Sua Sacola) conforme projeto acadêmico
   ========================================================================== */

// ============================================================
// ESTADO GLOBAL DA APLICAÇÃO
// ============================================================
const AppState = {
  currentPage: 'catalog',
  cart: [],
  filters: {
    search: '',
    category: 'todos',
    minPrice: '',
    maxPrice: '',
    sortBy: 'destaque',
    onlyFeatured: false
  },
  openProductId: null,
  checkoutStep: 1,

  get cartTotal() {
    return this.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  },

  get cartCount() {
    return this.cart.reduce((sum, item) => sum + item.qty, 0);
  }
};

// ============================================================
// UTILIDADES
// ============================================================
const Utils = {
  formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  },

  formatCEP(val) {
    const clean = val.replace(/\D/g, '').substring(0, 8);
    if (clean.length > 5) {
      return clean.slice(0, 5) + '-' + clean.slice(5);
    }
    return clean;
  },

  // Retorna o SVG de imagem pendente com montanhas e sol idêntico à foto
  getPendingPhotoSVG(variant = 'catalog') {
    if (variant === 'cart') {
      return `
        <div class="pending-photo-box cart-variant" aria-label="Fotografia pendente">
          <svg class="pending-photo-icon" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="2" y="2" width="60" height="44" rx="4" stroke="#1F3E2B" stroke-width="2"/>
            <circle cx="20" cy="15" r="4.5" stroke="#1F3E2B" stroke-width="2"/>
            <path d="M6 38L22 22L34 34L44 24L58 38" stroke="#1F3E2B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div class="pending-photo-label-main">FOTOGRAFIA PENDENTE</div>
          <div class="pending-photo-label-sub">Aguardando autorização</div>
        </div>
      `;
    }

    return `
      <div class="pending-photo-box" aria-label="Fotografia pendente">
        <svg class="pending-photo-icon" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="2" y="2" width="60" height="44" rx="4" stroke="#1F3E2B" stroke-width="2"/>
          <circle cx="20" cy="15" r="4.5" stroke="#1F3E2B" stroke-width="2"/>
          <path d="M6 38L22 22L34 34L44 24L58 38" stroke="#1F3E2B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="pending-photo-label-main">FOTOGRAFIA PENDENTE</div>
      </div>
    `;
  }
};

// ============================================================
// GESTÃO DO CARRINHO (SACOLA)
// ============================================================
const Cart = {
  add(productId, qty = 1) {
    const product = XUKURU_PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    const existing = AppState.cart.find(item => item.id === productId);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, product.stock);
    } else {
      AppState.cart.push({ ...product, qty: Math.min(qty, product.stock) });
    }
    this.persist();
    UI.updateCartBadge();
    UI.renderCartPage();
    Toast.show(`"${product.title}" adicionado à sacola! 🛒`);
  },

  remove(productId) {
    const removedItem = AppState.cart.find(item => item.id === productId);
    AppState.cart = AppState.cart.filter(item => item.id !== productId);
    this.persist();
    UI.updateCartBadge();
    UI.renderCartPage();
    if (removedItem) {
      Toast.show(`"${removedItem.title}" removido da sacola.`);
    }
  },

  updateQty(productId, delta) {
    const item = AppState.cart.find(i => i.id === productId);
    if (!item) return;
    const product = XUKURU_PRODUCTS.find(p => p.id === productId);
    const maxStock = product ? product.stock : 99;
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      this.remove(productId);
    } else {
      item.qty = Math.min(newQty, maxStock);
      this.persist();
      UI.updateCartBadge();
      UI.renderCartPage();
    }
  },

  clear() {
    AppState.cart = [];
    this.persist();
    UI.updateCartBadge();
    UI.renderCartPage();
    Toast.show('A sacola foi esvaziada.');
  },

  persist() {
    try {
      localStorage.setItem('xukuru_cart_demonstrative', JSON.stringify(AppState.cart));
    } catch (e) { /* noop */ }
  },

  restore() {
    try {
      const saved = localStorage.getItem('xukuru_cart_demonstrative');
      if (saved) {
        AppState.cart = JSON.parse(saved);
      } else {
        const initialItem = XUKURU_PRODUCTS.find(p => p.id === 1);
        if (initialItem) {
          AppState.cart = [{ ...initialItem, qty: 1 }];
          this.persist();
        }
      }
    } catch (e) {
      const initialItem = XUKURU_PRODUCTS.find(p => p.id === 1);
      if (initialItem) AppState.cart = [{ ...initialItem, qty: 1 }];
    }
  }
};

// ============================================================
// NOTIFICAÇÕES TOAST
// ============================================================
const Toast = {
  _el: null,
  _timer: null,

  show(msg, type = 'success') {
    if (!this._el) {
      this._el = document.getElementById('toast-notification');
    }
    if (!this._el) return;
    this._el.querySelector('.toast-msg').textContent = msg;
    this._el.querySelector('.toast-icon').textContent = type === 'warn' ? '⚠️' : '✅';
    this._el.classList.add('show');
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this._el.classList.remove('show'), 3500);
  }
};

// ============================================================
// FILTROS & BUSCA DO CATÁLOGO
// ============================================================
const Catalog = {
  getFiltered() {
    let items = [...XUKURU_PRODUCTS];
    const { search, category, minPrice, maxPrice, sortBy, onlyFeatured } = AppState.filters;

    if (category && category !== 'todos') {
      items = items.filter(p => p.category === category);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        (p.theme && p.theme.toLowerCase().includes(q)) ||
        p.description.toLowerCase().includes(q) ||
        (p.artisan && p.artisan.toLowerCase().includes(q))
      );
    }

    if (minPrice !== '' && !isNaN(minPrice)) {
      items = items.filter(p => p.price >= parseFloat(minPrice));
    }

    if (maxPrice !== '' && !isNaN(maxPrice)) {
      items = items.filter(p => p.price <= parseFloat(maxPrice));
    }

    if (onlyFeatured) {
      items = items.filter(p => p.featured === true);
    }

    switch (sortBy) {
      case 'menor_preco':
        items.sort((a, b) => a.price - b.price);
        break;
      case 'maior_preco':
        items.sort((a, b) => b.price - a.price);
        break;
      case 'nome':
        items.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'destaque':
      default:
        items.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.id - b.id);
    }

    return items;
  }
};

// ============================================================
// RENDERIZAÇÃO DA INTERFACE (UI)
// ============================================================
const UI = {

  // ----- RENDERIZAR O CATÁLOGO (FOTO DA DIREITA) -----
  renderCatalog() {
    const grid = document.getElementById('catalog-products-grid');
    const counterEl = document.getElementById('catalog-results-count');
    if (!grid) return;

    const items = Catalog.getFiltered();

    if (counterEl) {
      counterEl.textContent = `${items.length} ${items.length === 1 ? 'item' : 'itens'} de referência encontrado${items.length === 1 ? '' : 's'}`;
    }

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="catalog-empty-state">
          <div class="empty-icon">🔍</div>
          <h3>Nenhuma referência encontrada</h3>
          <p>Tente ajustar os filtros de categoria, faixa de valores ou termo de pesquisa.</p>
          <button type="button" class="btn-filter-apply" onclick="UI.clearFilters()" style="margin-top:1rem; width:auto; display:inline-block;">
            Limpar todos os filtros
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(p => this.renderCatalogCard(p)).join('');
    this.bindCatalogCardEvents(grid);
  },

  // Template do Card do Catálogo idêntico à Foto 2
  renderCatalogCard(p) {
    const themeLabel = p.theme || `TEMA DE PESQUISA • ${p.categoryName.toUpperCase()}`;
    const badgeFeaturedHtml = p.featured
      ? `<span class="product-tag badge-destaque">Destaque</span>`
      : '';

    return `
      <article class="demonstrative-catalog-card" data-id="${p.id}" role="article" aria-label="${p.title}">
        <!-- Moldura da Fotografia Pendente -->
        <div class="catalog-card-image-box">
          <div class="card-badges-row">
            <span class="product-tag badge-referencia">Item de referência</span>
            ${badgeFeaturedHtml}
          </div>

          <!-- Ícone e Ilustração Vetorial da Imagem Pendente -->
          ${Utils.getPendingPhotoSVG('catalog')}

          <!-- Legenda na base da moldura -->
          <div class="card-image-bottom-caption">
            FOTOGRAFIA AUTORIZADA DA PEÇA AINDA NÃO FORNECIDA.
          </div>
        </div>

        <!-- Conteúdo do Card -->
        <div class="catalog-card-content">
          <div class="catalog-card-theme">${themeLabel}</div>
          <h2 class="catalog-card-title">
            <a href="#" data-open-product="${p.id}">${p.title}</a>
          </h2>
          <p class="catalog-card-description">
            ${p.description}
          </p>

          <!-- Rodapé do Card -->
          <div class="catalog-card-footer">
            <div class="card-price-group">
              <span class="card-price-label">Valor de referência</span>
              <span class="card-price-value">${Utils.formatCurrency(p.price)}</span>
            </div>
            <button type="button" class="btn-card-view-item" data-open-product="${p.id}">
              Ver item &rarr;
            </button>
          </div>
        </div>
      </article>
    `;
  },

  bindCatalogCardEvents(container) {
    container.querySelectorAll('[data-open-product]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const id = parseInt(el.dataset.openProduct);
        this.openProductModal(id);
      });
    });
  },

  // ----- RENDERIZAR A PÁGINA DA SACOLA / CARRINHO COM AS PREFERÊNCIAS DA FOTO DA DIREITA -----
  renderCartPage() {
    const list = document.getElementById('cart-page-items-list');
    const itemsCountEl = document.getElementById('cart-summary-items-count');
    const subtotalEl = document.getElementById('cart-summary-subtotal-val');
    const referencesCountEl = document.getElementById('cart-references-count');

    if (!list) return;

    const totalQty = AppState.cartCount;
    const totalVal = AppState.cartTotal;

    // Atualizar contador no cabeçalho da sacola
    if (referencesCountEl) {
      referencesCountEl.textContent = `${totalQty} ${totalQty === 1 ? 'item' : 'itens'} de referência selecionado${totalQty === 1 ? '' : 's'}`;
    }

    // Atualizar os valores no card Resumo da seleção
    if (itemsCountEl) {
      itemsCountEl.textContent = `${totalQty} ${totalQty === 1 ? 'item' : 'itens'}`;
    }
    if (subtotalEl) {
      subtotalEl.textContent = Utils.formatCurrency(totalVal);
    }

    // Se estiver vazio
    if (AppState.cart.length === 0) {
      list.innerHTML = `
        <div class="cart-empty-message-box">
          <div style="font-size:3rem; margin-bottom:1rem;">🛒</div>
          <h3 style="font-family:'Cinzel',serif; color:var(--color-primary); margin-bottom:0.5rem;">Sua sacola está vazia</h3>
          <p style="color:#666; margin-bottom:1.5rem;">Você ainda não adicionou nenhuma referência demonstrativa.</p>
          <button type="button" class="btn-cart-checkout" onclick="UI.navigateTo('catalog')" style="max-width:240px;">
            Ir para o Catálogo
          </button>
        </div>
      `;
      return;
    }

    // Renderizar cada item da sacola com as preferências e visual da Foto da Direita
    list.innerHTML = AppState.cart.map(item => {
      const themeLabel = item.theme || `TEMA DE PESQUISA • ${item.categoryName.toUpperCase()}`;
      const badgeFeaturedHtml = item.featured
        ? `<span class="product-tag badge-destaque">Destaque</span>`
        : '';

      return `
        <article class="cart-item-row" data-cart-item="${item.id}">
          <!-- Miniatura da Imagem Pendente -->
          <div class="cart-item-photo-wrapper">
            <div class="cart-item-photo-frame">
              ${Utils.getPendingPhotoSVG('cart')}
            </div>
            <div class="cart-item-photo-caption">
              Fotografia autorizada da peça ainda não fornecida.
            </div>
          </div>

          <!-- Dados Centrais do Item (Com Preferências da Foto da Direita) -->
          <div class="cart-item-details-wrapper">
            <div class="cart-item-badges-row">
              <span class="product-tag badge-referencia">Item de referência</span>
              ${badgeFeaturedHtml}
            </div>

            <div class="cart-item-theme-tag">${themeLabel}</div>

            <h2 class="cart-item-title">
              <a href="#" class="cart-item-title-link" data-open-product="${item.id}">
                ${item.title}
              </a>
            </h2>

            <div class="cart-item-category-meta">
              ${item.categoryName} • referência visual
            </div>

            <p class="cart-item-demonstrative-desc">
              ${item.description}
            </p>

            <div class="cart-item-price-reference">
              Valor de referência: <strong>${Utils.formatCurrency(item.price)}</strong>
            </div>

            <div class="cart-item-remove-container">
              <button type="button" class="btn-remove-item-link" data-cart-remove="${item.id}">
                Remover ${item.title}
              </button>
            </div>
          </div>

          <!-- Seletor de Quantidade e Subtotal (Lado Direito do Card) -->
          <div class="cart-item-actions-wrapper">
            <div class="cart-item-qty-section">
              <div class="qty-field-label">Quantidade</div>
              <div class="cart-qty-stepper-box" role="group" aria-label="Alterar quantidade de ${item.title}">
                <button type="button" class="qty-stepper-btn" data-cart-decr="${item.id}" aria-label="Diminuir quantidade">−</button>
                <span class="qty-stepper-number" aria-live="polite">${item.qty}</span>
                <button type="button" class="qty-stepper-btn" data-cart-incr="${item.id}" aria-label="Aumentar quantidade">+</button>
              </div>
            </div>

            <div class="cart-item-subtotal-box">
              Subtotal de referência: <strong>${Utils.formatCurrency(item.price * item.qty)}</strong>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Eventos dos botões da sacola
    list.querySelectorAll('[data-cart-decr]').forEach(btn => {
      btn.addEventListener('click', () => Cart.updateQty(parseInt(btn.dataset.cartDecr), -1));
    });

    list.querySelectorAll('[data-cart-incr]').forEach(btn => {
      btn.addEventListener('click', () => Cart.updateQty(parseInt(btn.dataset.cartIncr), 1));
    });

    list.querySelectorAll('[data-cart-remove]').forEach(btn => {
      btn.addEventListener('click', () => Cart.remove(parseInt(btn.dataset.cartRemove)));
    });

    list.querySelectorAll('[data-open-product]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        UI.openProductModal(parseInt(btn.dataset.openProduct));
      });
    });
  },

  // ----- MODAL DE DETALHES DO PRODUTO -----
  openProductModal(productId) {
    const p = XUKURU_PRODUCTS.find(x => x.id === productId);
    if (!p) return;
    AppState.openProductId = productId;

    const modal = document.getElementById('product-modal-backdrop');
    const content = document.getElementById('product-modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <button class="modal-close-btn" id="modal-close-btn" aria-label="Fechar detalhes">✕</button>
      <div class="product-modal-grid">
        <div class="modal-gallery">
          <div class="modal-main-image-placeholder">
            <div class="card-badges-row" style="position:static; margin-bottom:1rem; display:flex; gap:0.5rem;">
              <span class="product-tag badge-referencia">Item de referência</span>
              ${p.featured ? '<span class="product-tag badge-destaque">Destaque</span>' : ''}
            </div>
            ${Utils.getPendingPhotoSVG('catalog')}
            <p style="font-size:0.75rem; color:#777; margin-top:1rem; text-align:center;">
              Fotografia autorizada da peça ainda não fornecida pelo artesão ou aldeia.
            </p>
          </div>
        </div>
        <div class="modal-product-info">
          <div class="modal-category-tag">${p.theme || 'TEMA DE PESQUISA • ' + p.categoryName.toUpperCase()}</div>
          <h2 class="modal-product-title">${p.title}</h2>
          <div class="modal-artisan-village">
            <span>📚</span>
            <strong>${p.artisan}</strong> — ${p.village}
          </div>

          <div class="modal-price-box">
            <div>
              <span style="font-size:0.8rem; color:#666; display:block;">Valor de referência</span>
              <div class="modal-price-main">${Utils.formatCurrency(p.price)}</div>
            </div>
          </div>

          <div class="modal-tab-desc">
            <h4>📖 Ficha Demonstrativa de Pesquisa</h4>
            <p>${p.description}</p>
          </div>

          <div class="modal-tab-desc">
            <h4>🌿 Materiais Referenciais</h4>
            <p>${p.materials}</p>
          </div>

          <div class="modal-tab-desc">
            <h4>📐 Dimensões Estimadas</h4>
            <p>${p.dimensions} | Peso: ${p.weight}</p>
          </div>

          <div class="modal-actions-bar" style="margin-top:1.5rem;">
            <button class="btn-buy-now" id="modal-add-to-cart-action">
              🛍 Adicionar à Sacola
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    document.getElementById('modal-add-to-cart-action').addEventListener('click', () => {
      Cart.add(p.id, 1);
      this.closeProductModal();
      this.navigateTo('cart');
    });

    document.getElementById('modal-close-btn').addEventListener('click', () => this.closeProductModal());
  },

  closeProductModal() {
    const modal = document.getElementById('product-modal-backdrop');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
    AppState.openProductId = null;
  },

  // ----- ATUALIZAR BADGE DO CARRINHO NO HEADER -----
  updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = AppState.cartCount;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  },

  // ----- NAVEGAÇÃO DE PÁGINAS -----
  navigateTo(page) {
    AppState.currentPage = page;

    document.querySelectorAll('.page-section').forEach(sec => {
      sec.style.display = sec.id === `page-${page}` ? 'block' : 'none';
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === page);
    });

    const navLinks = document.getElementById('nav-links');
    if (navLinks) navLinks.classList.remove('mobile-open');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (page === 'catalog') {
      this.renderCatalog();
    } else if (page === 'cart') {
      this.renderCartPage();
    } else if (page === 'home') {
      const homeGrid = document.getElementById('home-products-grid');
      if (homeGrid) {
        homeGrid.innerHTML = XUKURU_PRODUCTS.slice(0, 3).map(p => this.renderCatalogCard(p)).join('');
        this.bindCatalogCardEvents(homeGrid);
      }
    }
  },

  clearFilters() {
    AppState.filters = {
      search: '',
      category: 'todos',
      minPrice: '',
      maxPrice: '',
      sortBy: 'destaque',
      onlyFeatured: false
    };

    const sIn = document.getElementById('filter-search-input');
    const cSel = document.getElementById('filter-category-select');
    const pMin = document.getElementById('filter-price-min');
    const pMax = document.getElementById('filter-price-max');
    const sortSel = document.getElementById('filter-sort-select');
    const featCb = document.getElementById('filter-featured-checkbox');
    const headerSearch = document.getElementById('header-search-input');

    if (sIn) sIn.value = '';
    if (cSel) cSel.value = 'todos';
    if (pMin) pMin.value = '';
    if (pMax) pMax.value = '';
    if (sortSel) sortSel.value = 'destaque';
    if (featCb) featCb.checked = false;
    if (headerSearch) headerSearch.value = '';

    this.renderCatalog();
    Toast.show('Filtros restaurados.');
  }
};

// ============================================================
// CHECKOUT SIMULADO
// ============================================================
const Checkout = {
  open() {
    if (AppState.cart.length === 0) {
      Toast.show('Sua sacola está vazia.', 'warn');
      return;
    }
    const modal = document.getElementById('checkout-modal-backdrop');
    const content = document.getElementById('checkout-modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div style="padding:2.5rem; text-align:center; max-width:520px; margin:0 auto; background:#fff; border-radius:8px;">
        <div style="font-size:3.5rem; margin-bottom:1rem;">🌿</div>
        <h2 style="font-family:'Cinzel',serif; color:#1F3E2B; margin-bottom:1rem; font-size:1.75rem;">
          Finalização de Demonstração
        </h2>
        <p style="color:#555; font-size:0.95rem; line-height:1.6; margin-bottom:1.5rem;">
          Esta é uma plataforma acadêmica demonstrativa sobre o artesanato e a cultura do povo Xukuru do Ororubá.
          Nenhuma cobrança ou transação financeira é realizada.
        </p>
        <div style="background:#F9F6F0; border:1px solid #E5E0D8; padding:1.25rem; border-radius:6px; margin-bottom:1.75rem; text-align:left;">
          <div style="font-size:0.85rem; color:#777; margin-bottom:4px;">Resumo selecionado:</div>
          <div style="font-weight:700; color:#1F3E2B; font-size:1.1rem;">
            ${AppState.cartCount} ${AppState.cartCount === 1 ? 'item' : 'itens'} — Subtotal: ${Utils.formatCurrency(AppState.cartTotal)}
          </div>
        </div>
        <button type="button" id="btn-close-checkout-sim" style="background:#1F3E2B; color:#fff; width:100%; padding:0.85rem; border-radius:4px; font-weight:700; font-size:1rem; cursor:pointer;">
          Concluir Visualização
        </button>
      </div>
    `;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    document.getElementById('btn-close-checkout-sim').addEventListener('click', () => {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      Toast.show('Demonstração concluída com sucesso!');
    });
  },

  close() {
    const modal = document.getElementById('checkout-modal-backdrop');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
  }
};

// ============================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ============================================================
function initApp() {
  Cart.restore();
  UI.updateCartBadge();

  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      UI.navigateTo(el.dataset.page);
    });
  });

  const cartBtn = document.getElementById('cart-btn');
  if (cartBtn) {
    cartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      UI.navigateTo('cart');
    });
  }

  const headerSearchInput = document.getElementById('header-search-input');
  const headerSearchBtn = document.getElementById('header-search-btn');

  const executeHeaderSearch = () => {
    if (!headerSearchInput) return;
    const q = headerSearchInput.value.trim();
    AppState.filters.search = q;
    const filterInput = document.getElementById('filter-search-input');
    if (filterInput) filterInput.value = q;
    UI.navigateTo('catalog');
    UI.renderCatalog();
  };

  if (headerSearchBtn) headerSearchBtn.addEventListener('click', executeHeaderSearch);
  if (headerSearchInput) {
    headerSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeHeaderSearch();
      }
    });
  }

  const filterSearch = document.getElementById('filter-search-input');
  const filterCat = document.getElementById('filter-category-select');
  const filterPMin = document.getElementById('filter-price-min');
  const filterPMax = document.getElementById('filter-price-max');
  const filterSort = document.getElementById('filter-sort-select');
  const filterFeat = document.getElementById('filter-featured-checkbox');
  const btnApply = document.getElementById('catalog-apply-btn');
  const btnClear = document.getElementById('catalog-clear-btn');

  const applyCurrentFilters = () => {
    AppState.filters.search = filterSearch ? filterSearch.value : '';
    AppState.filters.category = filterCat ? filterCat.value : 'todos';
    AppState.filters.minPrice = filterPMin ? filterPMin.value : '';
    AppState.filters.maxPrice = filterPMax ? filterPMax.value : '';
    AppState.filters.sortBy = filterSort ? filterSort.value : 'destaque';
    AppState.filters.onlyFeatured = filterFeat ? filterFeat.checked : false;
    UI.renderCatalog();
  };

  if (btnApply) btnApply.addEventListener('click', applyCurrentFilters);
  if (btnClear) btnClear.addEventListener('click', () => UI.clearFilters());

  if (filterCat) filterCat.addEventListener('change', applyCurrentFilters);
  if (filterSort) filterSort.addEventListener('change', applyCurrentFilters);
  if (filterFeat) filterFeat.addEventListener('change', applyCurrentFilters);
  if (filterSearch) {
    filterSearch.addEventListener('input', () => {
      AppState.filters.search = filterSearch.value;
      UI.renderCatalog();
    });
  }

  const btnContinueCheckout = document.getElementById('btn-cart-page-checkout');
  if (btnContinueCheckout) {
    btnContinueCheckout.addEventListener('click', () => {
      Checkout.open();
    });
  }

  const btnClearAllCart = document.getElementById('btn-cart-clear-all');
  if (btnClearAllCart) {
    btnClearAllCart.addEventListener('click', (e) => {
      e.preventDefault();
      Cart.clear();
    });
  }

  const cepInput = document.getElementById('cart-cep-input');
  const btnVerifyCep = document.getElementById('btn-verify-cep-format');
  const cepStatus = document.getElementById('cart-cep-status-msg');

  if (cepInput) {
    cepInput.addEventListener('input', () => {
      cepInput.value = Utils.formatCEP(cepInput.value);
    });
  }

  if (btnVerifyCep && cepInput && cepStatus) {
    btnVerifyCep.addEventListener('click', () => {
      const clean = cepInput.value.replace(/\D/g, '');
      cepStatus.style.display = 'block';

      if (clean.length === 8) {
        cepStatus.className = 'cart-cep-status success';
        cepStatus.textContent = '✓ Formato de CEP válido (' + Utils.formatCEP(clean) + '). Cotação de frete indisponível.';
      } else {
        cepStatus.className = 'cart-cep-status error';
        cepStatus.textContent = 'Informe um CEP válido com 8 dígitos (ex: 55200-000).';
      }
    });
  }

  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.getElementById('nav-links');
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });
  }

  const prodModal = document.getElementById('product-modal-backdrop');
  if (prodModal) {
    prodModal.addEventListener('click', (e) => {
      if (e.target === prodModal) UI.closeProductModal();
    });
  }

  const checkoutModal = document.getElementById('checkout-modal-backdrop');
  if (checkoutModal) {
    checkoutModal.addEventListener('click', (e) => {
      if (e.target === checkoutModal) Checkout.close();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      UI.closeProductModal();
      Checkout.close();
    }
  });

  UI.navigateTo('catalog');
}

document.addEventListener('DOMContentLoaded', initApp);
