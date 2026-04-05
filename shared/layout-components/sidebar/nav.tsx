import React from "react";

// Icon definitions for HBC modules
const DashboardIcon = <i className="bx bx-home side-menu__icon"></i>;
const OrdersIcon = <i className="bx bx-cart side-menu__icon"></i>;
const InvoicesIcon = <i className="bx bx-receipt side-menu__icon"></i>;
const ProductsIcon = <i className="bx bx-package side-menu__icon"></i>;
const CustomersIcon = <i className="bx bx-user-circle side-menu__icon"></i>;
const ItemsIcon = <i className="bx bx-list-ul side-menu__icon"></i>;
const PaymentsIcon = <i className="bx bx-credit-card side-menu__icon"></i>;
const AddressIcon = <i className="bx bx-map-pin side-menu__icon"></i>;
const ReportsIcon = <i className="bx bx-bar-chart-square side-menu__icon"></i>;
const AuditIcon = <i className="bx bx-history side-menu__icon"></i>;
const SyncIcon = <i className="bx bx-sync side-menu__icon"></i>;
const SettingsIcon = <i className="bx bx-cog side-menu__icon"></i>;

export interface MenuItem {
  menutitle?: string;
  icon?: React.ReactNode;
  title?: string;
  type: "sub" | "link" | "empty";
  active?: boolean;
  selected?: boolean;
  path?: string;
  dirchange?: boolean;
  badge?: React.ReactNode;
  children?: MenuItem[];
  roles?: string[]; // For permission-based filtering
}

/**
 * Menu items for HBC Jewelry Management System
 * Supports role-based filtering: admin sees all, user sees limited items
 */
export const MenuItems: MenuItem[] = [
  {
    menutitle: "MAIN",
  },

  // Dashboard Section
  {
    icon: DashboardIcon,
    title: "Dashboards",
    type: "sub",
    active: false,
    selected: false,
    children: [
      {
        path: "/dashboards/admin",
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        title: "Admin Dashboard",
      },
    ],
  },

  // Business Modules Section
  {
    menutitle: "BUSINESS",
  },

  // Orders Module
  {
    icon: OrdersIcon,
    title: "Orders",
    type: "sub",
    active: false,
    selected: false,
    roles: ["admin", "user"],
    children: [
      {
        path: "/orders",
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        title: "All Orders",
      },
      {
        path: "/orders/create",
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        title: "Create Order",
      },
    ],
  },

  // Invoices Module
  {
    icon: InvoicesIcon,
    title: "Invoices",
    type: "sub",
    active: false,
    selected: false,
    roles: ["admin", "user"],
    children: [
      {
        path: "/invoices",
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        title: "All Invoices",
      },
    ],
  },

  // Products Module
  {
    icon: ProductsIcon,
    title: "Products",
    type: "sub",
    active: false,
    selected: false,
    roles: ["admin", "user"],
    children: [
      {
        path: "/products",
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        title: "Product Catalog",
      },
    ],
  },

  // Customers Module
  {
    icon: CustomersIcon,
    title: "Customers",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/customers",
    roles: ["admin"],
  },

  // Inventory/Items Module
  {
    icon: ItemsIcon,
    title: "Inventory",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/items",
    roles: ["admin"],
  },

  // Payments Module
  {
    icon: PaymentsIcon,
    title: "Payments",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/payments",
    roles: ["admin"],
  },

  // Addresses Module
  {
    icon: AddressIcon,
    title: "Addresses",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/addresses",
    roles: ["admin", "user"],
  },

  // Admin Section
  {
    menutitle: "ADMIN",
  },

  // Reports Module
  {
    icon: ReportsIcon,
    title: "Reports",
    type: "sub",
    active: false,
    selected: false,
    roles: ["admin"],
    children: [
      {
        path: "/reports/sales",
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        title: "Sales Report",
      },
      {
        path: "/reports/inventory",
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        title: "Inventory Report",
      },
      {
        path: "/reports/customers",
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        title: "Customer Report",
      },
    ],
  },

  // Audit Log
  {
    icon: AuditIcon,
    title: "Audit Log",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/audit-log",
    roles: ["admin"],
  },

  // Sync Dashboard
  {
    icon: SyncIcon,
    title: "Sync Dashboard",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/sync",
    roles: ["admin"],
  },

  // Settings Section
  {
    menutitle: "SETTINGS",
  },

  {
    icon: SettingsIcon,
    title: "Settings",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/settings",
    roles: ["admin", "user"],
  },
];

/**
 * Filter menu items based on user role
 * @param role - User role ("admin" or "user")
 * @returns Filtered menu items
 */
export const getMenuItemsByRole = (role: string = "user"): MenuItem[] => {
  return MenuItems.map((item) => {
    // Include menu titles
    if (!item.type) return item;

    // If no roles specified, include for all users
    if (!item.roles) return item;

    // Filter based on role
    if (item.roles.includes(role)) {
      // If it's a sub-menu, filter children recursively
      if (item.children) {
        return {
          ...item,
          children: item.children.filter(
            (child) => !child.roles || child.roles.includes(role)
          ),
        };
      }
      return item;
    }

    return null;
  }).filter((item) => item !== null) as MenuItem[];
};
