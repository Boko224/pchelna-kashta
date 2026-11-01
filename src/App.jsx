import { Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './lib/settings.jsx';
import { CartProvider } from './lib/cart.jsx';
import ShopLayout from './components/ShopLayout.jsx';
import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import ProductPage from './pages/ProductPage.jsx';
import CartPage from './pages/CartPage.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderSuccess from './pages/OrderSuccess.jsx';
import NotFound from './pages/NotFound.jsx';
import AdminLogin from './admin/AdminLogin.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import Dashboard from './admin/Dashboard.jsx';
import AdminProducts from './admin/AdminProducts.jsx';
import ProductForm from './admin/ProductForm.jsx';
import AdminCategories from './admin/AdminCategories.jsx';
import AdminOrders from './admin/AdminOrders.jsx';
import AdminOrderDetail from './admin/AdminOrderDetail.jsx';
import AdminSettings from './admin/AdminSettings.jsx';

export default function App() {
  return (
    <SettingsProvider>
      <CartProvider>
        <Routes>
          <Route element={<ShopLayout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<Catalog />} />
            <Route path="products/:slug" element={<ProductPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="order/:id" element={<OrderSuccess />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="admin/login" element={<AdminLogin />} />
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<ProductForm key="new" />} />
            <Route path="products/:id" element={<ProductForm />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetail />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </CartProvider>
    </SettingsProvider>
  );
}
