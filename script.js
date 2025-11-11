const API_URL = 'https://api.npoint.io/213d756b1bec1669ec20';

const listaProductos = document.getElementById('lista-productos');
const cartCount = document.getElementById('cart-count');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const btnCart = document.getElementById('btn-cart');
const filtroCategoria = document.getElementById('filtroCategoria');
const ordenarPor = document.getElementById('ordenarPor');
const busquedaInput = document.getElementById('busqueda');

let cart = JSON.parse(localStorage.getItem('dm_cart')) || {};
let todosLosProductos = [];
let productosFiltrados = [];

document.getElementById('anio').textContent = new Date().getFullYear();

function updateCartCount() {
  const totalQty = Object.values(cart).reduce((s, p) => s + p.qty, 0);
  cartCount.textContent = totalQty;
}

function saveCart() {
  localStorage.setItem('dm_cart', JSON.stringify(cart));
  updateCartCount();
}

async function loadProducts() {
  try {
    const res = await fetch(API_URL);
    const text = await res.text();
    let data = JSON.parse(text);
    let products = [];

    if (Array.isArray(data)) products = data;
    else if (data && Array.isArray(data.record?.data)) products = data.record.data;
    else if (data && Array.isArray(data.data)) products = data.data;
    else if (data && Array.isArray(data.products)) products = data.products;

    if (!Array.isArray(products) || products.length === 0) throw new Error('No hay productos');

    todosLosProductos = products;
    productosFiltrados = [...todosLosProductos];

    renderProducts(productosFiltrados);
    inicializarFiltros(products);
  } catch (err) {
    console.error(err);
    listaProductos.innerHTML = '<p class="text-danger">Error cargando productos.</p>';
  }
}

function inicializarFiltros(products) {
  if (!filtroCategoria) return;

  // Cargar categorías
  filtroCategoria.innerHTML = '<option value="todas">Todas las categorías</option>';
  const categorias = [...new Set(products.map(p => p.category).filter(Boolean))];
  categorias.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    filtroCategoria.appendChild(opt);
  });

  filtroCategoria.addEventListener('change', actualizarVista);
  ordenarPor.addEventListener('change', actualizarVista);
  busquedaInput.addEventListener('input', actualizarVista);
}

function actualizarVista() {
  const categoria = filtroCategoria.value;
  const orden = ordenarPor.value;
  const texto = busquedaInput.value.toLowerCase();

  let filtrados = [...todosLosProductos];

  // Filtrado por categoría
  if (categoria !== 'todas') {
    filtrados = filtrados.filter(p => p.category === categoria);
  }

  // Búsqueda
  if (texto.trim() !== '') {
    filtrados = filtrados.filter(p =>
      p.title.toLowerCase().includes(texto)
    );
  }

  // Ordenamiento
  switch (orden) {
    case 'az':
      filtrados.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'za':
      filtrados.sort((a, b) => b.title.localeCompare(a.title));
      break;
    case 'precio-asc':
      filtrados.sort((a, b) => a.price - b.price);
      break;
    case 'precio-desc':
      filtrados.sort((a, b) => b.price - a.price);
      break;
  }

  productosFiltrados = filtrados;
  renderProducts(productosFiltrados);
}

function renderProducts(products) {
  listaProductos.innerHTML = '';
  if (!products.length) {
    listaProductos.innerHTML = '<p class="text-muted">No se encontraron productos.</p>';
    return;
  }

  products.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'card p-3 product-card';
    card.innerHTML = `
      <img src="${p.image}" alt="${p.title}" class="img-fluid mb-2">
      <h5 class="mb-1">${p.title}</h5>
      <p class="mb-1">$ ${p.price.toFixed(0)}</p>
      <small class="text-muted">${p.category || 'Sin categoría'}</small>
      <div class="d-flex justify-content-between align-items-center mt-2">
        <input type="number" min="1" value="1" class="form-control me-2 qty-input" style="width:80px">
        <button class="btn btn-sm btn-primary add-to-cart">Agregar</button>
      </div>
    `;

    const btn = card.querySelector('.add-to-cart');
    btn.addEventListener('click', () => {
      const qty = parseInt(card.querySelector('.qty-input').value, 10) || 1;
      addToCart(p, qty);
    });

    listaProductos.appendChild(card);
  });
}

function addToCart(product, qty = 1) {
  if (cart[product.id]) {
    cart[product.id].qty += qty;
  } else {
    cart[product.id] = { ...product, qty };
  }
  saveCart();
  showToast(`${product.title} agregado al carrito (x${qty})`);
}

function renderCart() {
  cartItemsContainer.innerHTML = '';
  const keys = Object.keys(cart);
  if (keys.length === 0) {
    cartItemsContainer.innerHTML = '<p>El carrito está vacío.</p>';
    cartTotalEl.textContent = '0.00';
    return;
  }

  let total = 0;
  keys.forEach((id) => {
    const item = cart[id];
    const row = document.createElement('div');
    row.className = 'd-flex align-items-center gap-3 mb-3';
    row.innerHTML = `
      <img src="${item.image}" alt="${item.title}" width="64" height="64" style="object-fit:cover;border-radius:6px">
      <div class="flex-grow-1">
        <strong>${item.title}</strong>
        <div>$${item.price.toFixed(0)} c/u</div>
      </div>
      <div>
        <input type="number" min="1" value="${item.qty}" data-id="${id}" class="form-control qty-cart" style="width:90px">
      </div>
      <div>
        <button class="btn btn-sm btn-danger remove-item" data-id="${id}">Eliminar</button>
      </div>
    `;

    cartItemsContainer.appendChild(row);
    total += item.price * item.qty;
  });

  cartTotalEl.textContent = total.toFixed(0);

  cartItemsContainer.querySelectorAll('.qty-cart').forEach((input) => {
    input.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      const v = Math.max(1, parseInt(e.target.value, 10) || 1);
      cart[id].qty = v;
      saveCart();
      renderCart();
    });
  });

  cartItemsContainer.querySelectorAll('.remove-item').forEach((b) => {
    b.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      delete cart[id];
      saveCart();
      renderCart();
    });
  });
}

document.getElementById('clear-cart').addEventListener('click', () => {
  cart = {};
  saveCart();
  renderCart();
});

document.getElementById('checkout').addEventListener('click', () => {
  if (Object.keys(cart).length === 0) {
    showToast('El carrito está vacío');
    return;
  }
  cart = {};
  saveCart();
  renderCart();
  showToast('Gracias por tu compra (simulada)');
});

const cartModalEl = document.getElementById('cartModal');
const cartModal = new bootstrap.Modal(cartModalEl);
btnCart.addEventListener('click', () => {
  renderCart();
  cartModal.show();
});

window.addEventListener('storage', (e) => {
  if (e.key === 'dm_cart') {
    cart = JSON.parse(e.newValue) || {};
    updateCartCount();
  }
});

function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast-message';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

const contactForm = document.getElementById('contact-form');
contactForm.addEventListener('submit', (e) => {
  if (!contactForm.checkValidity()) {
    e.preventDefault();
    e.stopPropagation();
    contactForm.classList.add('was-validated');
    showToast('Completá correctamente el formulario antes de enviar.');
  } else {
    showToast('Enviando mensaje...');
  }
});

loadProducts();
updateCartCount();
