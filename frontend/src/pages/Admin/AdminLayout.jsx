import { useState} from "react";
import { useFetch } from "../../hooks/useFetch";
import apiClient from "../../services/apiClient";
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar,
  AppBar, IconButton, Typography, useTheme, useMediaQuery, Stack, Avatar, Menu, MenuItem, TextField, ListSubheader,
} from "@mui/material";
import {
  FiGrid, FiFolder, FiEdit3, FiBriefcase, FiAward, FiUsers, FiImage,
  FiMail, FiMenu, FiLogOut, FiExternalLink, FiClock, FiSliders, FiHelpCircle, FiInbox, FiLayers, FiPackage,
  FiCheckSquare, FiSearch, FiShield, FiKey, FiType, FiFileText,
} from "react-icons/fi";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AdminBrandProvider, useAdminBrand } from "../../context/AdminBrandContext";
import { useAuth } from "../../context/AuthContext";

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: "Dashboard", to: "/admin", icon: FiGrid, end: true },
  { label: "Site content", to: "/admin/content", icon: FiType, roles: ["SUPER_ADMIN", "ADMIN"] },
  { label: "Leads", to: "/admin/leads", icon: FiInbox },
  { label: "Ventures", to: "/admin/ventures", icon: FiLayers },
  { label: "Products", to: "/admin/products", icon: FiPackage },
  { label: "Approvals", to: "/admin/approvals", icon: FiCheckSquare },
  { label: "SEO", to: "/admin/seo", icon: FiSearch },
  { label: "Projects", to: "/admin/projects", icon: FiFolder },
  { label: "Blog", to: "/admin/blog", icon: FiEdit3 },
  { label: "Services", to: "/admin/services", icon: FiBriefcase },
  { label: "Experience", to: "/admin/experience", icon: FiClock },
  { label: "Certificates", to: "/admin/certificates", icon: FiAward },
  { label: "Skills", to: "/admin/skills", icon: FiSliders },
  { label: "Testimonials", to: "/admin/testimonials", icon: FiUsers },
  { label: "Gallery", to: "/admin/gallery", icon: FiImage },
  { label: "Achievements", to: "/admin/achievements", icon: FiAward },
  { label: "FAQ", to: "/admin/faq", icon: FiHelpCircle },
  { label: "Messages", to: "/admin/messages", icon: FiMail },
  { label: "Legal & compliance", to: "/admin/compliance", icon: FiFileText, superOnly: true },
  { label: "Users & access", to: "/admin/users", icon: FiShield, superOnly: true },
];

/** Narrows admin lists to one brand. The API still enforces access. */
function BrandSwitcher() {
  const { brands, brandKey, setBrandKey } = useAdminBrand();
  if (brands.length < 2) return null;
  return (
    <TextField
      id="admin-brand" select size="small" label="Brand" value={brandKey}
      onChange={(e) => setBrandKey(e.target.value)} sx={{ minWidth: { xs: 140, sm: 220 } }}
      SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
    >
      <MenuItem value="">All my brands</MenuItem>
      <ListSubheader>Brands</ListSubheader>
      {brands.map((b) => <MenuItem key={b.key} value={b.key}>{b.name}</MenuItem>)}
    </TextField>
  );
}

export default function AdminLayout() {
  return (
    <AdminBrandProvider>
      <AdminShell />
    </AdminBrandProvider>
  );
}

function AdminShell() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

   const { data: identity, loading } = useFetch(
    () => apiClient.get("/site-settings/identity").then((r) => r.data),
    []
  );

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar>
        {/* One admin serves every brand (report §03), so it carries the umbrella name. */}
        <Stack>
          <Typography sx={{ fontFamily: theme.custom.fontSerif, fontSize: "1.15rem", lineHeight: 1.1 }}>Devegen admin</Typography>
          {identity?.name && (
            <Typography sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.68rem", color: "text.secondary", letterSpacing: "0.06em" }}>
              {identity.name}
            </Typography>
          )}
        </Stack>
      </Toolbar>
      <List sx={{ flex: 1, px: 1 }}>
        {NAV_ITEMS.filter((item) => (!item.superOnly || user?.role === "SUPER_ADMIN") && (!item.roles || item.roles.includes(user?.role))).map((item) => {
          const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              selected={active}
              onClick={() => setMobileOpen(false)}
              sx={{ borderRadius: `${theme.custom.radii.md}px`, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: active ? "primary.main" : "text.secondary" }}>
                <Icon size={18} />
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: "0.9rem" }} />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <ListItemButton component="a" href="/" target="_blank" sx={{ borderRadius: `${theme.custom.radii.md}px` }}>
          <ListItemIcon sx={{ minWidth: 36 }}><FiExternalLink size={18} /></ListItemIcon>
          <ListItemText primary="View site" primaryTypographyProps={{ fontSize: "0.9rem" }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{ width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { md: `${DRAWER_WIDTH}px` } }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton onClick={() => setMobileOpen(true)} sx={{ mr: 1 }} aria-label="Open menu">
              <FiMenu />
            </IconButton>
          )}
          <BrandSwitcher />
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1} alignItems="center" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ cursor: "pointer" }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: "0.85rem" }}>
              {user?.name?.charAt(0) || "A"}
            </Avatar>
            <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" } }}>{user?.name}</Typography>
          </Stack>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            <MenuItem onClick={() => { setMenuAnchor(null); navigate("/admin/account"); }}>
              <FiKey size={16} style={{ marginRight: 8 }} /> Account &amp; password
            </MenuItem>
            <MenuItem onClick={logout}>
              <FiLogOut size={16} style={{ marginRight: 8 }} /> Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isMobile ? "temporary" : "permanent"}
          open={isMobile ? mobileOpen : true}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box", border: "none", borderRight: `1px solid ${theme.palette.divider}` } }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}