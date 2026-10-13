let products = [];
let cart = JSON.parse(localStorage.getItem("cart") || "[]");

const grid = document.getElementById("productGrid");
const search = document.getElementById("search");
const category = document.getElementById("category");

async function loadProducts() {
  const params = new URLSearchParams();
  if (search.value.trim()) params.set("q", search.value.trim());
  if (category.value) params.set("category", category.value);
  const res = await fetch("/api/products?" + params.toString());
  products = await res.json();
  renderProducts();
  fillCategories();
}

function fillCategories() {
  const current = category.value;
  const cats = [...new Set(products.map(p => p.category))];
  category.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option>${escapeHtml(c)}</option>`).join("");
  category.value = current;
}

function escapeHtml(v) {
  return String(v).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[x]));
}

function renderProducts() {
  if (!products.length) {
    grid.innerHTML = "<p>No products found.</p>";
    return;
  }
  grid.innerHTML = products.map(p => `
    <article class="card">
      <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">
      <div class="card-body">
        <div class="category">${escapeHtml(p.category)} • Stock: ${p.stock}</div>
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(p.description)}</p>
        <div class="price">₹${Number(p.price).toFixed(2)}</div>
        <button class="primary" onclick="addToCart(${p.id})" ${p.stock < 1 ? "disabled" : ""}>Add to Cart</button>
      </div>
    </article>`).join("");
}

function saveCart(){ localStorage.setItem("cart", JSON.stringify(cart)); updateCart(); }
function addToCart(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const item = cart.find(x => x.product_id === id);
  if (item) item.quantity++;
  else cart.push({product_id:id, quantity:1, name:p.name, price:p.price, image:p.image, stock:p.stock});
  saveCart();
  document.getElementById("cartPanel").classList.add("open");
  document.getElementById("overlay").classList.add("show");
}
function updateCart() {
  document.getElementById("cartCount").textContent = cart.reduce((s,x)=>s+x.quantity,0);
  document.getElementById("cartItems").innerHTML = cart.length ? cart.map((x,i)=>`
    <div class="cart-item">
      <img src="${escapeHtml(x.image)}"><div style="flex:1"><b>${escapeHtml(x.name)}</b><div>₹${x.price} × ${x.quantity}</div>
      <div class="qty"><button onclick="changeQty(${i},-1)">−</button> <button onclick="changeQty(${i},1)">+</button> <button onclick="removeItem(${i})">Remove</button></div></div>
    </div>`).join("") : "<p>Your cart is empty.</p>";
  document.getElementById("cartTotal").textContent = cart.reduce((s,x)=>s+x.price*x.quantity,0).toFixed(2);
}
function changeQty(i,d){cart[i].quantity+=d;if(cart[i].quantity<=0)cart.splice(i,1);saveCart();}
function removeItem(i){cart.splice(i,1);saveCart();}

search.addEventListener("input", loadProducts);
category.addEventListener("change", loadProducts);
document.getElementById("cartBtn").onclick=()=>{document.getElementById("cartPanel").classList.add("open");document.getElementById("overlay").classList.add("show")};
document.getElementById("closeCart").onclick=closeCart;
document.getElementById("overlay").onclick=closeCart;
function closeCart(){document.getElementById("cartPanel").classList.remove("open");document.getElementById("overlay").classList.remove("show");}

document.getElementById("checkoutBtn").onclick=()=>{
  if(!cart.length) return alert("Cart is empty.");
  document.getElementById("checkoutModal").classList.add("show");
};
document.getElementById("closeModal").onclick=()=>document.getElementById("checkoutModal").classList.remove("show");

document.getElementById("checkoutForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const body={customer_name:customerName.value,email:email.value,address:address.value,
    items:cart.map(x=>({product_id:x.product_id,quantity:x.quantity}))};
  const res=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await res.json();
  const msg=document.getElementById("checkoutMessage");
  msg.textContent=data.message || data.error;
  if(res.ok){cart=[];saveCart();e.target.reset();setTimeout(()=>document.getElementById("checkoutModal").classList.remove("show"),1500);loadProducts();}
});
loadProducts();
updateCart();
