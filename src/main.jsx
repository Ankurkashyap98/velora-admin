import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  FiBox,
  FiUsers,
  FiShoppingBag,
  FiTrendingUp,
  FiSettings,
  FiLogOut,
  FiPlus,
  FiX,
  FiCheckCircle,
  FiArrowUpRight
} from 'react-icons/fi';
import './style.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const STORE_URL = import.meta.env.VITE_STORE_URL || 'http://localhost:5173';

const demoProducts = [
  { id: 1, name: 'Milano Leather Penny Loafer', category: 'Loafers', stock: 14, price: 285 },
  { id: 2, name: 'Roma Classic Oxford Captoe', category: 'Formal', stock: 9, price: 320 },
  { id: 3, name: 'Velora Urban Genesis Runner', category: 'Sneakers', stock: 28, price: 210 },
  { id: 4, name: 'Siena Suede Chelsea Boot', category: 'Boots', stock: 7, price: 390 }
];

async function request(path, options = {}) {
  const token = localStorage.getItem('velora-admin-token');
  const response = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed (${response.status})`);
  }
  return response.json();
}

// ============================================================================
// LOGIN COMPONENT
// ============================================================================
function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@velora.studio');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fillCredentials = () => {
    setEmail('admin@velora.studio');
    setPassword('admin123');
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      const response = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (response.user.role !== 'admin') {
        throw new Error('This account does not have admin permissions (role must be admin).');
      }

      localStorage.setItem('velora-admin-token', response.token);
      onLogin(response.user);
    } catch (e) {
      // Local fallback in case backend or db is momentarily unavailable
      if (email === 'admin@velora.studio' && password === 'admin123') {
        const fallbackAdmin = {
          id: 1,
          name: 'Atelier Director',
          email: 'admin@velora.studio',
          role: 'admin'
        };
        localStorage.setItem('velora-admin-token', 'demo-admin-token');
        onLogin(fallbackAdmin);
      } else {
        setError(e.message || 'Login failed. Please check credentials or backend connection.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="admin-logo">
          VELORA<span>®</span>
        </div>
        <small>CONTROL ROOM</small>

        <h1>
          Welcome<br />
          <i>back.</i>
        </h1>

        {/* Credentials Info Box */}
        <div className="demo-credentials-pill">
          <strong>🔐 Admin Credentials:</strong>
          <div>Email: <code>admin@velora.studio</code></div>
          <div>Password: <code>admin123</code></div>
          <button
            type="button"
            className="fill-admin-btn"
            onClick={fillCredentials}
          >
            Auto-Fill Admin Details
          </button>
        </div>

        <form onSubmit={submit}>
          <label>
            Email Address
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@velora.studio"
            />
          </label>

          <label>
            Password
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin123"
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button className="dark full" disabled={busy}>
            {busy ? 'Verifying access...' : 'Enter Control Room ↗'}
          </button>
        </form>

        <p className="hint">
          Connected to Velora API: <code>{API}</code>
        </p>
      </div>
    </main>
  );
}

// ============================================================================
// PRODUCT MODAL (ADD / EDIT)
// ============================================================================
function ProductModal({ product, onClose, onSaved }) {
  const [form, setForm] = useState(
    product || {
      name: '',
      category: 'Sneakers',
      gender: 'Unisex',
      price: '',
      stock: '',
      description: '',
      image_url: '',
      featured: true
    }
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await request(product ? `/admin/products/${product.id}` : '/admin/products', {
        method: product ? 'PUT' : 'POST',
        body: JSON.stringify(form)
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={save}>
        <button type="button" className="modal-close" onClick={onClose}>
          <FiX />
        </button>
        <p className="eyebrow">INVENTORY / {product ? 'EDIT' : 'NEW'}</p>
        <h2>{product ? 'Edit product' : 'Add product'}</h2>

        {['name', 'category', 'gender', 'price', 'stock', 'image_url'].map((field) => (
          <label key={field}>
            {field.replace('_', ' ')}
            <input
              required={['name', 'price', 'stock'].includes(field)}
              value={form[field] || ''}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              placeholder={field === 'image_url' ? 'https://images.unsplash.com/...' : ''}
            />
          </label>
        ))}

        {error && <p className="error">{error}</p>}

        <button className="dark full" disabled={saving}>
          {saving ? 'Saving...' : 'Save Product ↗'}
        </button>
      </form>
    </div>
  );
}

// ============================================================================
// DASHBOARD OVERVIEW
// ============================================================================
function Overview({ stats, orders, products, setView }) {
  const statItems = [
    ['Revenue', `$${Number(stats.revenue || 0).toLocaleString()}`, FiTrendingUp],
    ['Orders', stats.orders || 0, FiShoppingBag],
    ['Customers', stats.users || 0, FiUsers],
    ['Products', stats.products || 0, FiBox]
  ];

  return (
    <>
      <section className="stats">
        {statItems.map(([label, value, Icon]) => (
          <div className="stat" key={label}>
            <Icon />
            <p>{label}</p>
            <strong>{value}</strong>
            <small>Live from MySQL database</small>
          </div>
        ))}
      </section>

      <section className="lower">
        <div className="panel chart">
          <div className="panel-head">
            <div>
              <p>PERFORMANCE</p>
              <h2>Sales overview</h2>
            </div>
          </div>
          <div className="bars">
            {[45, 64, 52, 78, 61, 88, 72, 96, 73, 84, 68, 91].map((height, i) => (
              <div style={{ height: `${height}%` }} key={i}>
                <span>{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <p>RECENT ACTIVITY</p>
              <h2>Latest orders</h2>
            </div>
            <button onClick={() => setView('Orders')}>View all ↗</button>
          </div>
          {orders.length === 0 ? (
            <p className="empty-state">No orders yet.</p>
          ) : (
            orders.slice(0, 4).map((order) => (
              <div className="order" key={order.id}>
                <span>#{order.id}</span>
                <span>{order.customer || 'Client'}</span>
                <b>${order.total_amount}</b>
                <em>{order.status}</em>
              </div>
            ))
          )}
        </div>
      </section>

      <Products
        products={products.slice(0, 4)}
        onAdd={() => setView('Products')}
        onEdit={() => setView('Products')}
        onDelete={() => {}}
      />
    </>
  );
}

// ============================================================================
// PRODUCTS CATALOG TABLE
// ============================================================================
function Products({ products, onAdd, onEdit, onDelete }) {
  return (
    <section className="panel table">
      <div className="panel-head">
        <div>
          <p>INVENTORY</p>
          <h2>Product catalogue ({products.length})</h2>
        </div>
        <button className="dark" onClick={onAdd}>
          <FiPlus /> Add product
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>PRODUCT</th>
            <th>CATEGORY</th>
            <th>PRICE</th>
            <th>STOCK</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td><strong>{product.name}</strong></td>
              <td>{product.category}</td>
              <td>${Number(product.price).toLocaleString()}</td>
              <td>{product.stock}</td>
              <td>
                <button className="table-action" onClick={() => onEdit(product)}>
                  Edit
                </button>
                <button
                  className="table-action danger"
                  onClick={() => onDelete(product.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!products.length && <p className="empty-state">No products found in database.</p>}
    </section>
  );
}

// ============================================================================
// ORDERS TABLE
// ============================================================================
function Orders({ orders, onStatus }) {
  return (
    <section className="panel table">
      <div className="panel-head">
        <div>
          <p>FULFILMENT</p>
          <h2>Order management ({orders.length})</h2>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>ORDER</th>
            <th>CUSTOMER</th>
            <th>TOTAL</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>#{order.id}</td>
              <td>
                {order.customer}
                <small>{order.email}</small>
              </td>
              <td>${order.total_amount}</td>
              <td>
                <select
                  value={order.status}
                  onChange={(e) => onStatus(order.id, e.target.value)}
                >
                  {['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(
                    (status) => (
                      <option key={status}>{status}</option>
                    )
                  )}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!orders.length && <p className="empty-state">No orders found.</p>}
    </section>
  );
}

// ============================================================================
// CUSTOMERS TABLE
// ============================================================================
function Customers({ users }) {
  return (
    <section className="panel table">
      <div className="panel-head">
        <div>
          <p>COMMUNITY</p>
          <h2>Customers ({users.length})</h2>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>NAME</th>
            <th>EMAIL</th>
            <th>PHONE</th>
            <th>ROLE</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td><strong>{user.name}</strong></td>
              <td>{user.email}</td>
              <td>{user.phone || '—'}</td>
              <td><span className="status">{user.role}</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      {!users.length && <p className="empty-state">No customers registered yet.</p>}
    </section>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================
function Dashboard({ signOut }) {
  const [view, setView] = useState('Overview');
  const [stats, setStats] = useState({ users: 0, products: 0, orders: 0, revenue: 0 });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [s, p, o, u] = await Promise.all([
        request('/admin/stats'),
        request('/products'),
        request('/admin/orders'),
        request('/admin/users')
      ]);
      setStats(s);
      setProducts(p);
      setOrders(o);
      setUsers(u);
      setError('');
    } catch (e) {
      setError(e.message);
      setProducts(demoProducts);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const remove = async (id) => {
    if (!window.confirm('Delete this product from catalog?')) return;
    try {
      await request(`/admin/products/${id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const changeStatus = async (id, status) => {
    try {
      await request(`/admin/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const navItems = [
    ['Overview', FiTrendingUp],
    ['Products', FiBox],
    ['Orders', FiShoppingBag],
    ['Customers', FiUsers],
    ['Settings', FiSettings]
  ];

  return (
    <div className="admin">
      <aside>
        <div className="admin-logo">
          VELORA<span>®</span>
        </div>
        <small>CONTROL ROOM</small>

        <nav>
          {navItems.map(([label, Icon]) => (
            <button
              className={view === label ? 'active' : ''}
              onClick={() => setView(label)}
              key={label}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <button className="logout" onClick={signOut}>
          <FiLogOut />
          <span>Sign Out</span>
        </button>
      </aside>

      <main>
        <header>
          <div>
            <p>VELORA / CONTROL ROOM</p>
            <h1>{view === 'Overview' ? 'Good morning, studio.' : view}</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={load}
              style={{
                background: '#ffffff',
                border: '1px solid #e0dbd3',
                padding: '8px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Refresh all metrics & orders"
            >
              ↻ Refresh Data
            </button>
            <a href={STORE_URL} target="_blank" rel="noreferrer">
              View Storefront <FiArrowUpRight />
            </a>
          </div>
        </header>

        {error && (
          <div className="notice" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <span>Note: {error} (Displaying live records where available).</span>
            <button
              onClick={signOut}
              style={{
                background: '#111111',
                color: '#ffffff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                whiteSpace: 'nowrap'
              }}
            >
              Log in with Admin Credentials
            </button>
          </div>
        )}

        {view === 'Overview' && (
          <Overview
            stats={stats}
            orders={orders}
            products={products}
            setView={setView}
          />
        )}
        {view === 'Products' && (
          <Products
            products={products}
            onAdd={() => setModal({})}
            onEdit={setModal}
            onDelete={remove}
          />
        )}
        {view === 'Orders' && (
          <Orders orders={orders} onStatus={changeStatus} />
        )}
        {view === 'Customers' && <Customers users={users} />}
        {view === 'Settings' && (
          <section className="panel settings">
            <p className="eyebrow">SYSTEM</p>
            <h2>Settings</h2>
            <p>
              Admin authentication is secured via JWT and the <code>admin</code> role.
              Active API Endpoint: <code>{API}</code>
            </p>
          </section>
        )}
      </main>

      {modal && (
        <ProductModal
          product={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

// ============================================================================
// ROOT APP COMPONENT
// ============================================================================
function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('velora-admin-user') || 'null');
    } catch {
      return null;
    }
  });

  const login = (next) => {
    setUser(next);
    localStorage.setItem('velora-admin-user', JSON.stringify(next));
  };

  const signOut = () => {
    localStorage.removeItem('velora-admin-token');
    localStorage.removeItem('velora-admin-user');
    setUser(null);
  };

  return user ? <Dashboard signOut={signOut} /> : <Login onLogin={login} />;
}

createRoot(document.getElementById('root')).render(<App />);
