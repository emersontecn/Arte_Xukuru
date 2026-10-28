/* ==========================================================================
   ARTE XUKURU DO ORORUBÁ - APLICAÇÃO JAVASCRIPT PRINCIPAL
   ========================================================================== */

// ============================================================
// ESTADO GLOBAL DA APLICAÇÃO
// ============================================================
const AppState = {
  currentPage: 'home',
  cart: [],
  wishlist: [],
  searchQuery: '',
  activeCategory: 'todos',
  sortBy: 'destaque',
  openProductId: null,
  checkoutStep: 1,
  paymentMethod: 'pix',
  couponCode: '',
  discount: 0,
  orderConfirmed: false,

  // Computed
  get cartTotal() {
    return this.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  },

  get cartCount() {
    return this.cart.reduce((sum, item) => sum + item.qty, 0);
  }
};

// ============================================================
// UTILIDADES GERAIS
// ============================================================
const Utils = {
  formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  },

  formatCEP(val) {
    return val.replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2');
  },

  renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let html = '';
    for (let i = 0; i < full; i++) html += '★';
    if (half) html += '☆';
    return html;
  },

  slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
};

// ============================================================
// GESTÃO DO CARRINHO
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
    UI.renderCartDrawer();
    Toast.show(`"${product.title.substring(0, 40)}…" adicionado ao carrinho! 🛒`);
  },

  remove(productId) {
    AppState.cart = AppState.cart.filter(item => item.id !== productId);
    this.persist();
    UI.updateCartBadge();
    UI.renderCartDrawer();
  },

  updateQty(productId, delta) {
    const item = AppState.cart.find(i => i.id === productId);
    if (!item) return;
    const product = XUKURU_PRODUCTS.find(p => p.id === productId);
    item.qty = Math.max(1, Math.min(item.qty + delta, product.stock));
    this.persist();
    UI.updateCartBadge();
    UI.renderCartDrawer();
  },

  applyCoupon(code) {
    const coupons = { 'XUKURU10': 10, 'NORDESTE15': 15, 'TORÉ20': 20 };
    const disc = coupons[code.toUpperCase()];
    if (disc) {
      AppState.discount = disc;
      AppState.couponCode = code.toUpperCase();
      Toast.show(`Cupom ${code.toUpperCase()} aplicado! ${disc}% de desconto 🎉`);
      UI.renderCartDrawer();
    } else {
      Toast.show('Cupom inválido. Tente: XUKURU10, NORDESTE15 ou TORÉ20 ⚠️', 'warn');
    }
  },

  getDiscountedTotal() {
    return AppState.cartTotal * (1 - AppState.discount / 100);
  },

  persist() {
    try {
      localStorage.setItem('xukuru_cart', JSON.stringify(AppState.cart));
    } catch (e) { /* noop */ }
  },

  restore() {
    try {
      const saved = localStorage.getItem('xukuru_cart');
      if (saved) AppState.cart = JSON.parse(saved);
    } catch (e) { AppState.cart = []; }
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
// CALCULADORA DE FRETE (SIMULAÇÃO)
// ============================================================
const Shipping = {
  calculate(cep, totalVal) {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    const freeThreshold = 350;
    const isFree = totalVal >= freeThreshold;

    return FRETE_CONFIG.opcoes.map(opt => {
      let preco = isFree && opt.id === 'pac' ? 0 : opt.precoBase;
      // Simulação: nordeste tem frete mais barato (código PE começa com 5)
      const prefix = parseInt(cleanCep.substring(0, 2));
      if (prefix >= 50 && prefix <= 56) preco = Math.max(0, preco - 8);

      return {
        id: opt.id,
        nome: opt.nome,
        preco,
        prazo: opt.prazoBase + Math.floor(Math.random() * 3),
        gratis: preco === 0
      };
    });
  }
};

// ============================================================
// FILTROS & BUSCA DO CATÁLOGO
// ============================================================
const Catalog = {
  getFiltered() {
    let items = [...XUKURU_PRODUCTS];

    // Filtro por categoria
    if (AppState.activeCategory !== 'todos') {
      items = items.filter(p => p.category === AppState.activeCategory);
    }

    // Filtro por busca
    if (AppState.searchQuery.trim()) {
      const q = AppState.searchQuery.toLowerCase();
      items = items.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.artisan.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.village.toLowerCase().includes(q) ||
        p.materials.toLowerCase().includes(q)
      );
    }

    // Ordenação
    switch (AppState.sortBy) {
      case 'menor_preco':
        items.sort((a, b) => a.price - b.price);
        break;
      case 'maior_preco':
        items.sort((a, b) => b.price - a.price);
        break;
      case 'avaliacao':
        items.sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount);
        break;
      case 'destaque':
      default:
        items.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.reviewsCount - a.reviewsCount);
    }

    return items;
  }
};

// ============================================================
// RENDERIZAÇÃO DA UI
// ============================================================
const UI = {
  // ----- Renderizar página home -----
  renderHome() {
    const featured = XUKURU_PRODUCTS.filter(p => p.featured).slice(0, 6);
    const grid = document.getElementById('home-products-grid');
    if (grid) {
      grid.innerHTML = featured.map(p => this.renderProductCard(p)).join('');
      this.bindProductCardEvents(grid);
    }
  },

  // ----- Renderizar catálogo -----
  renderCatalog() {
    const items = Catalog.getFiltered();
    const grid = document.getElementById('catalog-products-grid');
    const count = document.getElementById('catalog-results-count');

    if (count) {
      count.textContent = `${items.length} produto${items.length !== 1 ? 's' : ''} encontrado${items.length !== 1 ? 's' : ''}`;
    }

    if (grid) {
      if (items.length === 0) {
        grid.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:4rem; color:var(--color-text-muted);">
            <div style="font-size:3rem; margin-bottom:1rem;">🔍</div>
            <h3 style="font-family:'Outfit',sans-serif; color:var(--color-primary); margin-bottom:0.5rem;">Nenhum produto encontrado</h3>
            <p>Tente outro termo de busca ou selecione outra categoria.</p>
          </div>
        `;
      } else {
        grid.innerHTML = items.map(p => this.renderProductCard(p)).join('');
        this.bindProductCardEvents(grid);
      }
    }
  },

  // ----- Template de card de produto -----
  renderProductCard(p) {
    return `
      <article class="product-card" data-id="${p.id}" role="article" aria-label="${p.title}">
        <div class="product-image-wrap" data-open-product="${p.id}">
          <img src="${p.image}" alt="${p.title}" loading="lazy" />
          ${p.featured ? '<div class="product-badge">🌿 Destaque</div>' : ''}
          <button class="product-quick-view-btn" data-open-product="${p.id}" aria-label="Visualização rápida de ${p.title}">
            👁 Ver Detalhes
          </button>
        </div>
        <div class="product-body">
          <div class="product-artisan">
            <span>👤</span> ${p.artisan}
          </div>
          <h3 class="product-title" data-open-product="${p.id}">${p.title}</h3>
          <div class="product-rating" aria-label="Avaliação: ${p.rating} de 5">
            <div class="rating-stars" aria-hidden="true">${Utils.renderStars(p.rating)}</div>
            <span class="rating-score">${p.rating.toFixed(1)}</span>
            <span class="rating-count">(${p.reviewsCount})</span>
          </div>
          <div class="product-pricing">
            <div class="price-main" aria-label="Preço: ${Utils.formatCurrency(p.price)}">${Utils.formatCurrency(p.price)}</div>
            <div class="price-pix">💚 ${Utils.formatCurrency(p.price * 0.9)} no Pix (10% off)</div>
            <div class="price-installments">ou 3x de ${Utils.formatCurrency(p.price / 3)} sem juros</div>
          </div>
          <div class="product-actions">
            <button class="btn-add-cart" data-add-cart="${p.id}" aria-label="Adicionar ${p.title} ao carrinho">
              🛒 Adicionar ao Carrinho
            </button>
          </div>
        </div>
      </article>
    `;
  },

  // ----- Vincular eventos dos cards -----
  bindProductCardEvents(container) {
    container.querySelectorAll('[data-open-product]').forEach(el => {
      el.addEventListener('click', () => {
        const id = parseInt(el.dataset.openProduct);
        this.openProductModal(id);
      });
    });

    container.querySelectorAll('[data-add-cart]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.addCart);
        Cart.add(id);
        btn.textContent = '✅ Adicionado!';
        setTimeout(() => { btn.textContent = '🛒 Adicionar ao Carrinho'; }, 2000);
      });
    });
  },

  // ----- Modal de Produto -----
  openProductModal(productId) {
    const p = XUKURU_PRODUCTS.find(x => x.id === productId);
    if (!p) return;
    AppState.openProductId = productId;

    const modal = document.getElementById('product-modal-backdrop');
    const content = document.getElementById('product-modal-content');
    if (!modal || !content) return;

    let activeImg = p.image;

    const galleryThumbs = p.gallery.map((img, i) => `
      <button class="modal-thumb ${i === 0 ? 'active' : ''}" data-gallery-img="${img}" aria-label="Ver imagem ${i + 1}">
        <img src="${img}" alt="" loading="lazy" />
      </button>
    `).join('');

    content.innerHTML = `
      <button class="modal-close-btn" id="modal-close-btn" aria-label="Fechar modal">✕</button>
      <div class="product-modal-grid">
        <div class="modal-gallery">
          <div class="modal-main-image">
            <img id="modal-main-img" src="${activeImg}" alt="${p.title}" />
          </div>
          ${p.gallery.length > 1 ? `<div class="modal-thumbnails">${galleryThumbs}</div>` : ''}
        </div>
        <div class="modal-product-info">
          <div class="modal-category-tag">🪶 ${p.categoryName}</div>
          <h2 class="modal-product-title">${p.title}</h2>
          <div class="modal-artisan-village">
            <span>👤</span>
            <strong>${p.artisan}</strong> — ${p.village}
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
            <div class="rating-stars" style="color:var(--color-accent); font-size:1.1rem;">${Utils.renderStars(p.rating)}</div>
            <span style="font-weight:700;">${p.rating.toFixed(1)}</span>
            <span style="color:var(--color-text-muted); font-size:0.85rem;">(${p.reviewsCount} avaliações verificadas)</span>
          </div>

          <div class="modal-price-box">
            <div>
              <div class="modal-price-main">${Utils.formatCurrency(p.price)}</div>
              <div style="font-size:0.82rem; color:var(--color-text-muted); margin-top:2px;">ou 3x de ${Utils.formatCurrency(p.price / 3)} sem juros</div>
            </div>
            <div class="modal-pix-badge">💚 ${Utils.formatCurrency(p.price * 0.9)} no Pix</div>
          </div>

          <div class="modal-tab-desc">
            <h4>📖 Sobre esta Peça</h4>
            <p>${p.description}</p>
          </div>

          <div class="modal-tab-desc">
            <h4>🌿 Materiais Utilizados</h4>
            <p>${p.materials}</p>
          </div>

          <div class="modal-tab-desc">
            <h4>📐 Especificações</h4>
            <p><strong>Dimensões:</strong> ${p.dimensions} | <strong>Peso:</strong> ${p.weight} | <strong>Estoque disponível:</strong> ${p.stock} unidades</p>
          </div>

          <div class="shipping-calculator-box">
            <div class="shipping-calc-title">
              <span>📦</span> Calcular Frete
            </div>
            <div class="shipping-input-group">
              <input type="text" id="shipping-cep-input" placeholder="Digite seu CEP (ex: 01310-100)" maxlength="9" aria-label="CEP para cálculo de frete" />
              <button id="shipping-calc-btn" aria-label="Calcular frete">OK</button>
            </div>
            <div id="shipping-results-list" class="shipping-results" role="status" aria-live="polite"></div>
          </div>

          <div class="modal-actions-bar">
            <div class="qty-control" role="group" aria-label="Quantidade">
              <button class="qty-btn" id="modal-qty-minus" aria-label="Diminuir quantidade">−</button>
              <span class="qty-value" id="modal-qty-val">1</span>
              <button class="qty-btn" id="modal-qty-plus" aria-label="Aumentar quantidade">+</button>
            </div>
            <button class="btn-buy-now" id="modal-add-cart-btn" data-product-id="${p.id}" aria-label="Adicionar ao carrinho">
              🛒 Adicionar ao Carrinho
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // --- Galeria interativa ---
    let modalQty = 1;
    const mainImg = document.getElementById('modal-main-img');

    content.querySelectorAll('.modal-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        content.querySelectorAll('.modal-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        mainImg.src = thumb.dataset.galleryImg;
      });
    });

    // Controle de quantidade
    document.getElementById('modal-qty-minus').addEventListener('click', () => {
      if (modalQty > 1) {
        modalQty--;
        document.getElementById('modal-qty-val').textContent = modalQty;
      }
    });

    document.getElementById('modal-qty-plus').addEventListener('click', () => {
      if (modalQty < p.stock) {
        modalQty++;
        document.getElementById('modal-qty-val').textContent = modalQty;
      }
    });

    // Adicionar ao carrinho
    document.getElementById('modal-add-cart-btn').addEventListener('click', () => {
      Cart.add(productId, modalQty);
    });

    // Calculadora de frete
    const cepInput = document.getElementById('shipping-cep-input');
    const calcBtn = document.getElementById('shipping-calc-btn');
    const resultsList = document.getElementById('shipping-results-list');

    cepInput.addEventListener('input', () => {
      let v = cepInput.value.replace(/\D/g, '').substring(0, 8);
      if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
      cepInput.value = v;
    });

    calcBtn.addEventListener('click', () => {
      const results = Shipping.calculate(cepInput.value, p.price * modalQty);
      if (!results) {
        resultsList.innerHTML = '<p style="color:#c0392b; font-size:0.85rem; margin-top:0.5rem;">CEP inválido. Digite os 8 dígitos.</p>';
        resultsList.style.display = 'flex';
        return;
      }
      resultsList.style.display = 'flex';
      resultsList.innerHTML = results.map(r => `
        <div class="shipping-option-item">
          <span>
            <strong>${r.nome}</strong><br>
            <span style="color:var(--color-text-muted); font-size:0.8rem;">Prazo estimado: ${r.prazo} dias úteis</span>
          </span>
          <span style="font-weight:700; color:${r.gratis ? 'var(--color-primary)' : 'var(--color-text)'};">
            ${r.gratis ? '✅ GRÁTIS' : Utils.formatCurrency(r.preco)}
          </span>
        </div>
      `).join('');
    });

    // Fechar modal
    document.getElementById('modal-close-btn').addEventListener('click', () => this.closeProductModal());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeProductModal();
    });
  },

  closeProductModal() {
    const modal = document.getElementById('product-modal-backdrop');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
    AppState.openProductId = null;
  },

  // ----- Drawer do Carrinho -----
  renderCartDrawer() {
    const list = document.getElementById('cart-items-list');
    const subEl = document.getElementById('cart-subtotal');
    const discEl = document.getElementById('cart-discount-row');
    const totalEl = document.getElementById('cart-total-val');
    const pixEl = document.getElementById('cart-pix-val');

    if (!list) return;

    if (AppState.cart.length === 0) {
      list.innerHTML = `
        <div class="empty-cart-state">
          <div class="empty-cart-icon">🛒</div>
          <h4 style="color:var(--color-primary);">Seu carrinho está vazio</h4>
          <p style="color:var(--color-text-muted); font-size:0.9rem; max-width:220px;">Explore nosso catálogo e adicione peças únicas da cultura Xukuru.</p>
          <button onclick="UI.navigateTo('catalog'); UI.toggleCartDrawer(false);" style="background:var(--color-secondary); color:#FFF; padding:0.65rem 1.5rem; border-radius:var(--radius-full); font-weight:600; font-size:0.9rem;">Ver Catálogo</button>
        </div>
      `;
    } else {
      list.innerHTML = AppState.cart.map(item => `
        <div class="cart-item-card" data-cart-item="${item.id}">
          <div class="cart-item-img">
            <img src="${item.image}" alt="${item.title}" />
          </div>
          <div class="cart-item-details">
            <div class="cart-item-name">${item.title.substring(0, 50)}${item.title.length > 50 ? '…' : ''}</div>
            <div class="cart-item-price">${Utils.formatCurrency(item.price)}</div>
            <div class="cart-item-qty-row">
              <div class="cart-item-qty-btns">
                <button data-cart-decr="${item.id}" aria-label="Diminuir quantidade">−</button>
                <span>${item.qty}</span>
                <button data-cart-incr="${item.id}" aria-label="Aumentar quantidade">+</button>
              </div>
              <button class="cart-item-remove-btn" data-cart-remove="${item.id}" aria-label="Remover item">🗑 Remover</button>
            </div>
          </div>
        </div>
      `).join('');

      // Vincular botões dos itens
      list.querySelectorAll('[data-cart-decr]').forEach(btn => {
        btn.addEventListener('click', () => Cart.updateQty(parseInt(btn.dataset.cartDecr), -1));
      });
      list.querySelectorAll('[data-cart-incr]').forEach(btn => {
        btn.addEventListener('click', () => Cart.updateQty(parseInt(btn.dataset.cartIncr), +1));
      });
      list.querySelectorAll('[data-cart-remove]').forEach(btn => {
        btn.addEventListener('click', () => Cart.remove(parseInt(btn.dataset.cartRemove)));
      });
    }

    // Atualizar totais
    if (subEl) subEl.textContent = Utils.formatCurrency(AppState.cartTotal);
    if (discEl) {
      discEl.style.display = AppState.discount > 0 ? 'flex' : 'none';
      discEl.querySelector('.disc-val').textContent = `− ${Utils.formatCurrency(AppState.cartTotal * AppState.discount / 100)} (${AppState.discount}% off)`;
    }
    const discounted = Cart.getDiscountedTotal();
    if (totalEl) totalEl.textContent = Utils.formatCurrency(discounted);
    if (pixEl) pixEl.textContent = Utils.formatCurrency(discounted * 0.9);
  },

  toggleCartDrawer(open) {
    const backdrop = document.getElementById('cart-drawer-backdrop');
    if (!backdrop) return;
    if (open === undefined) open = !backdrop.classList.contains('open');
    backdrop.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  },

  // ----- Badge do carrinho -----
  updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = AppState.cartCount;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
    badge.classList.add('bump');
    setTimeout(() => badge.classList.remove('bump'), 400);
  },

  // ----- Navegação de Páginas -----
  navigateTo(page) {
    AppState.currentPage = page;
    document.querySelectorAll('.page-section').forEach(el => {
      el.style.display = el.id === `page-${page}` ? 'block' : 'none';
    });

    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.page === page);
    });

    // Fechar menu mobile
    const navLinks = document.getElementById('nav-links');
    if (navLinks) navLinks.classList.remove('mobile-open');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (page === 'home') this.renderHome();
    if (page === 'catalog') {
      AppState.activeCategory = 'todos';
      AppState.searchQuery = '';
      AppState.sortBy = 'destaque';
      const searchInput = document.getElementById('catalog-search-input');
      const sortSelect = document.getElementById('catalog-sort-select');
      if (searchInput) searchInput.value = '';
      if (sortSelect) sortSelect.value = 'destaque';
      document.querySelectorAll('.category-pill').forEach(p => p.classList.toggle('active', p.dataset.cat === 'todos'));
      this.renderCatalog();
    }
  }
};

// ============================================================
// CHECKOUT
// ============================================================
const Checkout = {
  open() {
    if (AppState.cart.length === 0) {
      Toast.show('Adicione produtos ao carrinho primeiro! 😊', 'warn');
      return;
    }
    AppState.checkoutStep = 1;
    AppState.paymentMethod = 'pix';
    const modal = document.getElementById('checkout-modal-backdrop');
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      this.renderStep();
    }
  },

  close() {
    const modal = document.getElementById('checkout-modal-backdrop');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
  },

  renderStep() {
    const content = document.getElementById('checkout-modal-content');
    if (!content) return;

    const steps = [
      { num: 1, name: 'Identificação' },
      { num: 2, name: 'Endereço' },
      { num: 3, name: 'Pagamento' },
      { num: 4, name: 'Confirmação' }
    ];

    const stepsHtml = steps.map(s => `
      <div class="checkout-step-item ${AppState.checkoutStep === s.num ? 'active' : ''} ${AppState.checkoutStep > s.num ? 'completed' : ''}">
        <div class="step-circle">${AppState.checkoutStep > s.num ? '✓' : s.num}</div>
        <span class="step-name">${s.name}</span>
      </div>
    `).join('<div style="flex:1; height:2px; background: var(--color-border); margin:0 0.5rem; margin-bottom:1.5rem;"></div>');

    let stepBody = '';

    if (AppState.checkoutStep === 1) {
      stepBody = `
        <h3 style="font-size:1.5rem; color:var(--color-primary); margin-bottom:1.5rem;">Seus Dados</h3>
        <div class="checkout-form-grid">
          <div class="form-group">
            <label for="co-nome">Nome completo *</label>
            <input type="text" id="co-nome" placeholder="João da Silva" required />
          </div>
          <div class="form-group">
            <label for="co-cpf">CPF *</label>
            <input type="text" id="co-cpf" placeholder="000.000.000-00" maxlength="14" required />
          </div>
          <div class="form-group">
            <label for="co-email">E-mail *</label>
            <input type="email" id="co-email" placeholder="joao@email.com" required />
          </div>
          <div class="form-group">
            <label for="co-tel">Telefone / WhatsApp *</label>
            <input type="tel" id="co-tel" placeholder="(87) 99999-0000" required />
          </div>
        </div>
      `;
    } else if (AppState.checkoutStep === 2) {
      stepBody = `
        <h3 style="font-size:1.5rem; color:var(--color-primary); margin-bottom:1.5rem;">Endereço de Entrega</h3>
        <div class="checkout-form-grid">
          <div class="form-group">
            <label for="co-cep">CEP *</label>
            <input type="text" id="co-cep" placeholder="00000-000" maxlength="9" required />
          </div>
          <div class="form-group">
            <label for="co-uf">Estado *</label>
            <select id="co-uf">
              <option value="">Selecione...</option>
              <option value="PE">Pernambuco</option>
              <option value="BA">Bahia</option>
              <option value="CE">Ceará</option>
              <option value="PB">Paraíba</option>
              <option value="RN">Rio Grande do Norte</option>
              <option value="AL">Alagoas</option>
              <option value="SE">Sergipe</option>
              <option value="PI">Piauí</option>
              <option value="MA">Maranhão</option>
              <option value="SP">São Paulo</option>
              <option value="RJ">Rio de Janeiro</option>
              <option value="MG">Minas Gerais</option>
              <option value="outros">Outros Estados</option>
            </select>
          </div>
          <div class="form-group">
            <label for="co-cidade">Cidade *</label>
            <input type="text" id="co-cidade" placeholder="Pesqueira" required />
          </div>
          <div class="form-group">
            <label for="co-bairro">Bairro *</label>
            <input type="text" id="co-bairro" placeholder="Centro" required />
          </div>
          <div class="form-group full-width">
            <label for="co-rua">Rua e Número *</label>
            <input type="text" id="co-rua" placeholder="Rua das Flores, 123" required />
          </div>
          <div class="form-group full-width">
            <label for="co-comp">Complemento</label>
            <input type="text" id="co-comp" placeholder="Apto 4B, Bloco C..." />
          </div>
        </div>

        <h4 style="margin: 1.5rem 0 1rem; font-size:1rem; color:var(--color-primary);">📦 Opção de Envio</h4>
        <div style="display:flex; flex-direction:column; gap:0.75rem;" id="checkout-shipping-opts">
          ${FRETE_CONFIG.opcoes.map(opt => `
            <label style="display:flex; align-items:center; justify-content:space-between; background:var(--color-bg); border:1px solid var(--color-border); padding:1rem; border-radius:var(--radius-md); cursor:pointer;" class="shipping-opt-label">
              <div style="display:flex; align-items:center; gap:0.75rem;">
                <input type="radio" name="checkout_shipping" value="${opt.id}" ${opt.id === 'pac' ? 'checked' : ''} style="accent-color:var(--color-primary);"/>
                <div>
                  <strong>${opt.nome}</strong><br>
                  <small style="color:var(--color-text-muted);">Origem: ${FRETE_CONFIG.cidadeOrigem}</small>
                </div>
              </div>
              <div style="text-align:right;">
                <strong>${Utils.formatCurrency(opt.precoBase)}</strong><br>
                <small>${opt.prazoBase}+ dias úteis</small>
              </div>
            </label>
          `).join('')}
        </div>
      `;
    } else if (AppState.checkoutStep === 3) {
      const pixCode = 'pixartexukuru' + Date.now().toString(36).toUpperCase();
      const total = Cart.getDiscountedTotal();

      stepBody = `
        <h3 style="font-size:1.5rem; color:var(--color-primary); margin-bottom:0.5rem;">Forma de Pagamento</h3>
        <p style="color:var(--color-text-muted); margin-bottom:1.25rem; font-size:0.9rem;">Total do pedido: <strong>${Utils.formatCurrency(total)}</strong></p>
        <div class="payment-selector-tabs">
          <button class="payment-tab-btn ${AppState.paymentMethod === 'pix' ? 'active' : ''}" id="pay-pix-btn">
            <span style="font-size:1.5rem;">💚</span>
            <strong>PIX</strong>
            <small style="color:var(--color-secondary); font-weight:700;">10% de desconto</small>
          </button>
          <button class="payment-tab-btn ${AppState.paymentMethod === 'cartao' ? 'active' : ''}" id="pay-card-btn">
            <span style="font-size:1.5rem;">💳</span>
            <strong>Cartão de Crédito</strong>
            <small>Até 3x sem juros</small>
          </button>
        </div>
        <div id="payment-pix-area" style="display:${AppState.paymentMethod === 'pix' ? 'block' : 'none'};">
          <div class="pix-checkout-box">
            <p style="font-weight:700; color:var(--color-primary); font-size:1.1rem; margin-bottom:0.25rem;">Pague com PIX e economize 10%!</p>
            <p style="color:var(--color-text-muted); font-size:0.9rem; margin-bottom:0.75rem;">Valor: <strong style="color:var(--color-primary); font-size:1.2rem;">${Utils.formatCurrency(total * 0.9)}</strong></p>
            <div class="pix-qr-code-wrap">
              <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:3px; opacity:0.85;">
                ${Array.from({length: 25}, () => `<div style="width:16px; height:16px; background:${Math.random() > 0.45 ? '#1F3E2B' : '#F9F6F0'}; border-radius:2px;"></div>`).join('')}
              </div>
            </div>
            <div class="pix-copy-paste-row">
              <input type="text" id="pix-code-input" value="${pixCode}" readonly aria-label="Código PIX copia e cola" />
              <button onclick="document.getElementById('pix-code-input').select(); document.execCommand('copy'); Toast.show('Código copiado! 📋');" style="background:var(--color-primary); color:#FFF; padding:0 1rem; border-radius:var(--radius-sm); font-weight:600; font-size:0.85rem;">Copiar</button>
            </div>
          </div>
        </div>
        <div id="payment-card-area" style="display:${AppState.paymentMethod === 'cartao' ? 'block' : 'none'};">
          <div class="checkout-form-grid">
            <div class="form-group full-width">
              <label for="co-cardnum">Número do Cartão *</label>
              <input type="text" id="co-cardnum" placeholder="0000 0000 0000 0000" maxlength="19" />
            </div>
            <div class="form-group full-width">
              <label for="co-cardname">Nome no Cartão *</label>
              <input type="text" id="co-cardname" placeholder="JOÃO DA SILVA" />
            </div>
            <div class="form-group">
              <label for="co-cardval">Validade *</label>
              <input type="text" id="co-cardval" placeholder="MM/AA" maxlength="5" />
            </div>
            <div class="form-group">
              <label for="co-cardcvv">CVV *</label>
              <input type="text" id="co-cardcvv" placeholder="123" maxlength="3" />
            </div>
            <div class="form-group full-width">
              <label for="co-parcelas">Parcelamento</label>
              <select id="co-parcelas">
                <option value="1">1x de ${Utils.formatCurrency(total)} sem juros</option>
                <option value="2">2x de ${Utils.formatCurrency(total / 2)} sem juros</option>
                <option value="3">3x de ${Utils.formatCurrency(total / 3)} sem juros</option>
              </select>
            </div>
          </div>
        </div>
      `;
    } else if (AppState.checkoutStep === 4) {
      const orderId = 'XKR-' + Date.now().toString(36).toUpperCase();
      AppState.cart = [];
      AppState.discount = 0;
      AppState.couponCode = '';
      Cart.persist();
      UI.updateCartBadge();

      stepBody = `
        <div class="checkout-success-box">
          <div class="success-icon-check">✅</div>
          <h2 style="color:var(--color-primary); margin-bottom:0.5rem;">Pedido Confirmado!</h2>
          <p style="color:var(--color-text-muted); max-width:480px; margin:0 auto 1.5rem; line-height:1.6;">
            Obrigado por adquirir arte indígena genuína do povo <strong>Xukuru do Ororubá</strong>! 
            Cada compra fortalece a autonomia econômica e cultural das aldeias da Serra do Ororubá em Pesqueira (PE).
          </p>
          <div style="background:var(--color-bg); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:1.25rem; max-width:380px; margin:0 auto 2rem;">
            <p style="font-size:0.85rem; color:var(--color-text-muted); margin-bottom:0.35rem;">Nº do Pedido</p>
            <p style="font-size:1.45rem; font-weight:800; color:var(--color-primary); font-family:'Cinzel',serif;">${orderId}</p>
            <p style="font-size:0.82rem; color:var(--color-text-muted); margin-top:0.35rem;">Você receberá uma confirmação por e-mail em breve.</p>
          </div>
          <button onclick="Checkout.close();" style="background:var(--color-secondary); color:#FFF; padding:0.9rem 2.5rem; border-radius:var(--radius-md); font-weight:700; font-size:1rem; box-shadow:0 4px 14px rgba(196,90,53,0.35);">
            🛍 Continuar Explorando
          </button>
        </div>
      `;
    }

    content.innerHTML = `
      <button class="modal-close-btn" id="checkout-close-btn" aria-label="Fechar checkout">✕</button>
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
        <h2 style="font-size:1.85rem; color:var(--color-primary);">Finalizar Compra</h2>
        <div style="font-size:0.82rem; color:var(--color-text-muted); background:var(--color-bg); padding:0.35rem 0.85rem; border-radius:var(--radius-full); display:flex; align-items:center; gap:0.35rem;">
          🔒 Compra Segura SSL
        </div>
      </div>
      <div class="checkout-steps-nav">${stepsHtml}</div>
      ${stepBody}
      ${AppState.checkoutStep < 4 ? `
        <div style="display:flex; align-items:center; justify-content:${AppState.checkoutStep > 1 ? 'space-between' : 'flex-end'}; margin-top:2rem; gap:1rem; border-top:1px solid var(--color-border); padding-top:1.5rem;">
          ${AppState.checkoutStep > 1 ? `<button id="checkout-back-btn" style="background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text); padding:0.8rem 1.75rem; border-radius:var(--radius-md); font-weight:600;">← Voltar</button>` : ''}
          <button id="checkout-next-btn" style="background:var(--color-secondary); color:#FFF; padding:0.8rem 2rem; border-radius:var(--radius-md); font-weight:700; font-size:1rem; box-shadow:0 4px 14px rgba(196,90,53,0.35); display:flex; align-items:center; gap:0.5rem;">
            ${AppState.checkoutStep === 3 ? '✅ Confirmar Pedido' : 'Continuar →'}
          </button>
        </div>
      ` : ''}
    `;

    // Vincular botões do checkout
    document.getElementById('checkout-close-btn').addEventListener('click', () => this.close());
    const nextBtn = document.getElementById('checkout-next-btn');
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextStep());
    const backBtn = document.getElementById('checkout-back-btn');
    if (backBtn) backBtn.addEventListener('click', () => this.prevStep());

    // Alternar método de pagamento
    const pixBtn = document.getElementById('pay-pix-btn');
    const cardBtn = document.getElementById('pay-card-btn');
    if (pixBtn) {
      pixBtn.addEventListener('click', () => {
        AppState.paymentMethod = 'pix';
        document.querySelectorAll('.payment-tab-btn').forEach(b => b.classList.remove('active'));
        pixBtn.classList.add('active');
        document.getElementById('payment-pix-area').style.display = 'block';
        document.getElementById('payment-card-area').style.display = 'none';
      });
    }
    if (cardBtn) {
      cardBtn.addEventListener('click', () => {
        AppState.paymentMethod = 'cartao';
        document.querySelectorAll('.payment-tab-btn').forEach(b => b.classList.remove('active'));
        cardBtn.classList.add('active');
        document.getElementById('payment-pix-area').style.display = 'none';
        document.getElementById('payment-card-area').style.display = 'block';
      });
    }
  },

  nextStep() {
    if (AppState.checkoutStep < 4) {
      AppState.checkoutStep++;
      this.renderStep();
      document.querySelector('.checkout-modal-container').scrollTop = 0;
    }
  },

  prevStep() {
    if (AppState.checkoutStep > 1) {
      AppState.checkoutStep--;
      this.renderStep();
    }
  }
};

// ============================================================
// INICIALIZAÇÃO DO APP
// ============================================================
function initApp() {
  Cart.restore();
  UI.updateCartBadge();
  UI.renderHome();
  UI.renderCartDrawer();

  // Navegação principal
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      UI.navigateTo(el.dataset.page);
    });
  });

  // Botão menu mobile
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.getElementById('nav-links');
  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });
  }

  // Carrinho drawer
  document.getElementById('cart-btn').addEventListener('click', () => UI.toggleCartDrawer(true));
  document.getElementById('cart-drawer-close-btn').addEventListener('click', () => UI.toggleCartDrawer(false));
  const cartBackdrop = document.getElementById('cart-drawer-backdrop');
  cartBackdrop.addEventListener('click', (e) => {
    if (e.target === cartBackdrop) UI.toggleCartDrawer(false);
  });

  // Cupom de desconto
  document.getElementById('coupon-apply-btn').addEventListener('click', () => {
    const code = document.getElementById('coupon-input').value.trim();
    if (code) Cart.applyCoupon(code);
  });

  // Checkout
  document.getElementById('btn-checkout').addEventListener('click', () => {
    UI.toggleCartDrawer(false);
    Checkout.open();
  });
  const checkoutBackdrop = document.getElementById('checkout-modal-backdrop');
  checkoutBackdrop.addEventListener('click', (e) => {
    if (e.target === checkoutBackdrop) Checkout.close();
  });

  // Fechar modal produto
  document.getElementById('product-modal-backdrop').addEventListener('click', (e) => {
    if (e.target === document.getElementById('product-modal-backdrop')) UI.closeProductModal();
  });

  // Busca no catálogo
  const searchInput = document.getElementById('catalog-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      AppState.searchQuery = searchInput.value;
      UI.renderCatalog();
    });
  }

  // Categoria pills
  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      AppState.activeCategory = pill.dataset.cat;
      UI.renderCatalog();
    });
  });

  // Ordenação
  const sortSelect = document.getElementById('catalog-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      AppState.sortBy = sortSelect.value;
      UI.renderCatalog();
    });
  }

  // Tecla ESC fecha modais
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      UI.closeProductModal();
      Checkout.close();
      UI.toggleCartDrawer(false);
    }
  });

  // ============================================================
  // ✨ PREMIUM VISUAL ENHANCEMENTS — Scroll-Reveal & Efeitos
  // ============================================================

  // 1. Navbar glassmorphism ao scrollar
  const siteHeader = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      siteHeader?.classList.add('scrolled');
    } else {
      siteHeader?.classList.remove('scrolled');
    }
  }, { passive: true });

  // 2. Scroll-Reveal usando IntersectionObserver com classes .reveal
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  // Aplicar classes de reveal a elementos estáticos das páginas
  const revealTargets = [
    { selector: '.trust-item',         className: 'reveal'       },
    { selector: '.value-card',         className: 'reveal'       },
    { selector: '.section-header',     className: 'reveal'       },
    { selector: '.purpose-content',    className: 'reveal-right' },
    { selector: '.purpose-image',      className: 'reveal-left'  },
    { selector: '.story-content',      className: 'reveal-right' },
    { selector: '.story-image-wrap',   className: 'reveal-left'  },
    { selector: '.wikipedia-highlight-card', className: 'reveal' },
    { selector: '.footer-col',         className: 'reveal'       },
    { selector: '.footer-brand',       className: 'reveal-left'  },
  ];

  revealTargets.forEach(({ selector, className }) => {
    document.querySelectorAll(selector).forEach(el => {
      // Só aplica se ainda não tiver uma classe reveal
      if (!el.classList.contains('reveal') &&
          !el.classList.contains('reveal-left') &&
          !el.classList.contains('reveal-right')) {
        el.classList.add(className);
        revealObserver.observe(el);
      }
    });
  });

  // 3. Scroll-reveal para product-cards renderizados dinamicamente (legado)
  const legacyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        legacyObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  // Função pública para re-observar cards após renderização
  window.observeNewCards = () => {
    document.querySelectorAll('.product-card:not([data-observed])').forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      card.dataset.observed = 'true';
      legacyObserver.observe(card);
    });
  };
}

document.addEventListener('DOMContentLoaded', initApp);

