import React from "react";

// Icon definitions for HBC modules
const DashboardIcon = <i className="bx bx-home side-menu__icon"></i>;
const OrdersIcon = <i className="bx bx-cart side-menu__icon"></i>;
const InvoicesIcon = <i className="bx bx-receipt side-menu__icon"></i>;
const ProductsIcon = <i className="bx bx-package side-menu__icon"></i>;
const CustomersIcon = <i className="bx bx-user-circle side-menu__icon"></i>;
const ItemsIcon = <i className="bx bx-list-ul side-menu__icon"></i>;
const PaymentsIcon = <i className="bx bx-credit-card side-menu__icon"></i>;
const CreditsIcon = <i className="bx bx-wallet side-menu__icon"></i>;
const AddressIcon = <i className="bx bx-map-pin side-menu__icon"></i>;
const ReportsIcon = <i className="bx bx-bar-chart-square side-menu__icon"></i>;
const AuditIcon = <i className="bx bx-history side-menu__icon"></i>;
const SyncIcon = <i className="bx bx-sync side-menu__icon"></i>;
const SettingsIcon = <i className="bx bx-cog side-menu__icon"></i>;
const RatesIcon = <i className="bx bx-line-chart side-menu__icon"></i>;
const TargetsIcon = <i className="bx bx-layer side-menu__icon"></i>;
const CollectionsIcon = <i className="bx bx-calendar-check side-menu__icon"></i>;
const DeliveryIcon = <i className="bx bx-package side-menu__icon"></i>;
const BuybackIcon = <i className="bx bx-undo side-menu__icon"></i>;
const NotificationsIcon = <i className="bx bx-bell side-menu__icon"></i>;
const AccessIcon = <i className="bx bx-shield-quarter side-menu__icon"></i>;
const HelpIcon = <i className="bx bx-help-circle side-menu__icon"></i>;

export interface MenuItem {
  menutitle?: string;
  icon?: React.ReactNode;
  title?: string;
  type: "sub" | "link" | "empty" | "external";
  active?: boolean;
  selected?: boolean;
  path?: string;
  target?: string;
  dirchange?: boolean;
  badge?: React.ReactNode;
  badgetxt?: string;
  class?: string;
  children?: MenuItem[];
  roles?: string[];         // role-based visibility ("admin" | "user")
  superAdminOnly?: boolean; // when true, only shown to SuperAdmin role
}

/**
 * Menu items for HBC Jewelry Management System
 * Supports role-based filtering: admin sees all, user sees limited items
 */
export const MenuItems: MenuItem[] = [
  {
    menutitle: "MAIN",
  },

  // Dashboard — flat link (no sub-menu); we only have one dashboard route
  {
    icon: DashboardIcon,
    title: "Dashboard",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/dashboards/admin",
  },

  // Business Modules Section
  {
    menutitle: "BUSINESS",
  },

  // Orders — direct link (Create Order is reachable from the +New button on /orders)
  {
    icon: OrdersIcon,
    title: "Orders",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/orders",
    roles: ["admin", "user"],
  },

  // Invoices — direct link (single destination)
  {
    icon: InvoicesIcon,
    title: "Invoices",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/invoices",
    roles: ["admin", "user"],
  },

  // Targets — direct link
  {
    icon: TargetsIcon,
    title: "Targets",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/targets",
    roles: ["admin"],
  },

  // Collections — promoted to top-level so Targets can stay a flat link
  {
    icon: CollectionsIcon,
    title: "Collections",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/targets/collections",
    roles: ["admin"],
  },

  // Delivery (V1)
  {
    icon: DeliveryIcon,
    title: "Delivery",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/delivery",
    roles: ["admin"],
  },

  // Buybacks
  {
    icon: BuybackIcon,
    title: "Buybacks",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/buybacks",
    roles: ["admin"],
  },

  // Push Notifications
  {
    icon: NotificationsIcon,
    title: "Notifications",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/notifications",
    roles: ["admin"],
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

  // Customer Approvals
  {
    icon: CustomersIcon,
    title: "Approvals",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/customers/approvals",
    roles: ["admin"],
  },

  // Products/Items Module
  {
    icon: ItemsIcon,
    title: "Products",
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
    type: "sub",
    active: false,
    selected: false,
    dirchange: false,
    roles: ["admin"],
    children: [
      { path: "/payments",               type: "link", active: false, selected: false, title: "All Payments" },
      { path: "/payments/store-pending", type: "link", active: false, selected: false, title: "Store Payments" },
    ],
  },

  // Credits / Wallet Ledger
  {
    icon: CreditsIcon,
    title: "Credits",
    type: "sub",
    active: false,
    selected: false,
    dirchange: false,
    roles: ["admin"],
    children: [
      {
        path: "/credits",
        type: "link",
        active: false,
        selected: false,
        title: "Ledger",
      },
      {
        path: "/credits/pending",
        type: "link",
        active: false,
        selected: false,
        title: "Pending Deposits",
      },
    ],
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
      {
        path: "/reports/payment-aging",
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        title: "Payment Aging",
      },
      {
        path: "/reports/invoice-overdue",
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        title: "Overdue Invoices",
      },
      {
        path: "/reports/connectips-reconciliation",
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        title: "ConnectIPS Recon",
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

  // Silver Rates
  {
    icon: RatesIcon,
    title: "Silver Rates",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/rates",
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

  // Access (Roles + Staff Users)
  {
    icon: AccessIcon,
    title: "Access",
    type: "sub",
    active: false,
    selected: false,
    roles: ["admin"],
    children: [
      { path: "/access/roles", type: "link", active: false, selected: false, dirchange: false, title: "Roles & Permissions" },
      { path: "/access/users", type: "link", active: false, selected: false, dirchange: false, title: "Staff Users" },
      { path: "/access/security", type: "link", active: false, selected: false, dirchange: false, title: "Security & Audit" },
      { path: "/access/connectips-probe", type: "link", active: false, selected: false, dirchange: false, title: "ConnectIPS Probe" },
    ],
  },

  // Settings Section
  {
    menutitle: "SETTINGS",
  },

  {
    icon: SettingsIcon,
    title: "Settings",
    type: "sub",
    active: false,
    selected: false,
    dirchange: false,
    roles: ["admin", "user"],
    children: [
      { path: "/settings", type: "link", active: false, selected: false, dirchange: false, title: "General" },
      { path: "/settings/operations", type: "link", active: false, selected: false, dirchange: false, title: "Operations" },
      { path: "/settings/ubo", type: "link", active: false, selected: false, dirchange: false, title: "UBO Declaration", superAdminOnly: true },
      { path: "/settings/notifications", type: "link", active: false, selected: false, dirchange: false, title: "Notifications", superAdminOnly: true },
      { path: "/settings/connectips", type: "link", active: false, selected: false, dirchange: false, title: "ConnectIPS / NCHL", superAdminOnly: true },
    ],
  },

  // Help Section
  {
    menutitle: "HELP",
  },

  {
    icon: HelpIcon,
    title: "User Manual",
    type: "external",
    active: false,
    selected: false,
    dirchange: false,
    path: "/help.html",
    target: "_blank",
    roles: ["admin", "user"],
  },
];

/**
 * Filter menu items based on user role
 * @param role - User role ("admin" or "user")
 * @returns Filtered menu items
 */
export const getMenuItemsByRole = (role: string = "user", rawRole: string = ""): MenuItem[] => {
  const isSuperAdmin = rawRole === "SuperAdmin";

  const filterChildren = (children: MenuItem[]): MenuItem[] =>
    children.filter(child => {
      if (child.superAdminOnly && !isSuperAdmin) return false;
      if (child.roles && !child.roles.includes(role)) return false;
      return true;
    });

  return MenuItems.map((item) => {
    if (!item.type) return item;
    if (!item.roles) return item;

    if (!item.roles.includes(role)) return null;

    if (item.children) {
      const filteredChildren = filterChildren(item.children);
      // Hide sub-menu entirely if all children are filtered out
      if (filteredChildren.length === 0) return null;
      return { ...item, children: filteredChildren };
    }

    return item;
  }).filter((item) => item !== null) as MenuItem[];
};
