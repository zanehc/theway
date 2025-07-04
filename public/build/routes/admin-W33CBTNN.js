import {
  require_node,
  require_supabase
} from "/build/_shared/chunk-JNABDDE3.js";
import {
  CheckCircle,
  Clock,
  Coffee,
  PenSquare,
  Settings,
  Users,
  XCircle
} from "/build/_shared/chunk-JEVRW7VH.js";
import {
  useActionData,
  useLoaderData,
  useRevalidator
} from "/build/_shared/chunk-QUWGJE46.js";
import {
  createHotContext
} from "/build/_shared/chunk-EOTLWUVH.js";
import "/build/_shared/chunk-UWV35TSL.js";
import "/build/_shared/chunk-U4FRFQSK.js";
import {
  require_jsx_dev_runtime
} from "/build/_shared/chunk-XGOTYLZ5.js";
import {
  require_react
} from "/build/_shared/chunk-7M6SC7J5.js";
import {
  __toESM
} from "/build/_shared/chunk-PNG5AS42.js";

// app/routes/admin.tsx
var import_node = __toESM(require_node(), 1);
var import_react2 = __toESM(require_react(), 1);
var import_supabase = __toESM(require_supabase(), 1);
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/admin.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/admin.tsx"
  );
  import.meta.hot.lastModified = "1751666668930.3772";
}
function AdminPage() {
  _s();
  const {
    orders,
    menus
  } = useLoaderData();
  const actionData = useActionData();
  const revalidator = useRevalidator();
  const [activeTab, setActiveTab] = (0, import_react2.useState)("orders");
  const [editingMenu, setEditingMenu] = (0, import_react2.useState)(null);
  const pendingOrders = orders.filter((order) => order.status === "pending");
  const preparingOrders = orders.filter((order) => order.status === "preparing");
  const readyOrders = orders.filter((order) => order.status === "ready");
  const getStatusColor2 = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "preparing":
        return "bg-blue-100 text-blue-800";
      case "ready":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Clock, { className: "w-4 h-4" }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 175,
          columnNumber: 16
        }, this);
      case "preparing":
        return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Coffee, { className: "w-4 h-4" }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 177,
          columnNumber: 16
        }, this);
      case "ready":
        return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CheckCircle, { className: "w-4 h-4" }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 179,
          columnNumber: 16
        }, this);
      case "completed":
        return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CheckCircle, { className: "w-4 h-4" }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 181,
          columnNumber: 16
        }, this);
      case "cancelled":
        return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(XCircle, { className: "w-4 h-4" }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 183,
          columnNumber: 16
        }, this);
      default:
        return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Clock, { className: "w-4 h-4" }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 185,
          columnNumber: 16
        }, this);
    }
  };
  const handleStatusUpdate = async (orderId, status) => {
    const formData = new FormData();
    formData.append("action", "updateOrderStatus");
    formData.append("orderId", orderId);
    formData.append("status", status);
    await fetch("/admin", {
      method: "POST",
      body: formData
    });
    revalidator.revalidate();
  };
  const handlePaymentUpdate = async (orderId, paymentStatus) => {
    const formData = new FormData();
    formData.append("action", "updatePaymentStatus");
    formData.append("orderId", orderId);
    formData.append("paymentStatus", paymentStatus);
    await fetch("/admin", {
      method: "POST",
      body: formData
    });
    revalidator.revalidate();
  };
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "min-h-screen bg-ivory-50", children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("header", { className: "bg-white shadow-sm border-b border-ivory-200", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex justify-between items-center h-16", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", { className: "text-xl font-semibold text-warm-brown-900", children: "\uAD00\uB9AC\uC790 \uB300\uC2DC\uBCF4\uB4DC" }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 215,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex items-center space-x-4", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "text-sm text-warm-brown-600", children: [
        "\uCD1D \uC8FC\uBB38: ",
        orders.length,
        "\uAC1C"
      ] }, void 0, true, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 219,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 218,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 214,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 213,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 212,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "mb-8", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex space-x-1 bg-ivory-200 p-1 rounded-lg", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: () => setActiveTab("orders"), className: `flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "orders" ? "bg-white text-wine-red-600 shadow-sm" : "text-warm-brown-600 hover:text-warm-brown-900"}`, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Users, { className: "w-4 h-4" }, void 0, false, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 232,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "\uC8FC\uBB38 \uD604\uD669" }, void 0, false, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 233,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 231,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: () => setActiveTab("menus"), className: `flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "menus" ? "bg-white text-wine-red-600 shadow-sm" : "text-warm-brown-600 hover:text-warm-brown-900"}`, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Settings, { className: "w-4 h-4" }, void 0, false, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 236,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "\uBA54\uB274 \uAD00\uB9AC" }, void 0, false, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 237,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 235,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 230,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 229,
        columnNumber: 9
      }, this),
      actionData?.error && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "mb-6 text-red-600 text-sm bg-red-50 p-3 rounded-lg", children: actionData.error }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 242,
        columnNumber: 31
      }, this),
      activeTab === "orders" && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "grid lg:grid-cols-3 gap-6", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "card", children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { className: "text-lg font-semibold text-warm-brown-900 mb-4 flex items-center", children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Clock, { className: "w-5 h-5 text-yellow-600 mr-2" }, void 0, false, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 250,
              columnNumber: 17
            }, this),
            "\uB300\uAE30 \uC911 (",
            pendingOrders.length,
            ")"
          ] }, void 0, true, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 249,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "space-y-3", children: [
            pendingOrders.map((order) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(OrderCard, { order, onStatusUpdate: handleStatusUpdate, onPaymentUpdate: handlePaymentUpdate }, order.id, false, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 254,
              columnNumber: 45
            }, this)),
            pendingOrders.length === 0 && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { className: "text-warm-brown-500 text-center py-4", children: "\uB300\uAE30 \uC911\uC778 \uC8FC\uBB38\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }, void 0, false, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 255,
              columnNumber: 48
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 253,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 248,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "card", children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { className: "text-lg font-semibold text-warm-brown-900 mb-4 flex items-center", children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Coffee, { className: "w-5 h-5 text-blue-600 mr-2" }, void 0, false, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 264,
              columnNumber: 17
            }, this),
            "\uC81C\uC870 \uC911 (",
            preparingOrders.length,
            ")"
          ] }, void 0, true, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 263,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "space-y-3", children: [
            preparingOrders.map((order) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(OrderCard, { order, onStatusUpdate: handleStatusUpdate, onPaymentUpdate: handlePaymentUpdate }, order.id, false, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 268,
              columnNumber: 47
            }, this)),
            preparingOrders.length === 0 && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { className: "text-warm-brown-500 text-center py-4", children: "\uC81C\uC870 \uC911\uC778 \uC8FC\uBB38\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }, void 0, false, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 269,
              columnNumber: 50
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 267,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 262,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "card", children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { className: "text-lg font-semibold text-warm-brown-900 mb-4 flex items-center", children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CheckCircle, { className: "w-5 h-5 text-green-600 mr-2" }, void 0, false, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 278,
              columnNumber: 17
            }, this),
            "\uC644\uB8CC (",
            readyOrders.length,
            ")"
          ] }, void 0, true, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 277,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "space-y-3", children: [
            readyOrders.map((order) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(OrderCard, { order, onStatusUpdate: handleStatusUpdate, onPaymentUpdate: handlePaymentUpdate }, order.id, false, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 282,
              columnNumber: 43
            }, this)),
            readyOrders.length === 0 && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { className: "text-warm-brown-500 text-center py-4", children: "\uC644\uB8CC\uB41C \uC8FC\uBB38\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }, void 0, false, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 283,
              columnNumber: 46
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 281,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 276,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 246,
        columnNumber: 36
      }, this),
      activeTab === "menus" && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "space-y-6", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "card", children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { className: "text-lg font-semibold text-warm-brown-900 mb-4", children: "\uC0C8 \uBA54\uB274 \uCD94\uAC00" }, void 0, false, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 293,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MenuForm, { onSubmit: async (formData) => {
            await fetch("/admin", {
              method: "POST",
              body: formData
            });
            revalidator.revalidate();
          } }, void 0, false, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 296,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 292,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "card", children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { className: "text-lg font-semibold text-warm-brown-900 mb-4", children: "\uBA54\uB274 \uBAA9\uB85D" }, void 0, false, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 307,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-4", children: menus.map((menu) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MenuCard, { menu, onEdit: () => setEditingMenu(menu), onUpdate: async (formData) => {
            await fetch("/admin", {
              method: "POST",
              body: formData
            });
            revalidator.revalidate();
            setEditingMenu(null);
          } }, menu.id, false, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 311,
            columnNumber: 36
          }, this)) }, void 0, false, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 310,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 306,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 290,
        columnNumber: 35
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 227,
      columnNumber: 7
    }, this),
    editingMenu && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "bg-white rounded-lg p-6 max-w-md w-full", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { className: "text-lg font-semibold text-warm-brown-900 mb-4", children: "\uBA54\uB274 \uD3B8\uC9D1" }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 327,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MenuForm, { menu: editingMenu, onSubmit: async (formData) => {
        await fetch("/admin", {
          method: "POST",
          body: formData
        });
        revalidator.revalidate();
        setEditingMenu(null);
      } }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 330,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: () => setEditingMenu(null), className: "mt-4 w-full btn-secondary", children: "\uCDE8\uC18C" }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 338,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 326,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 325,
      columnNumber: 23
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/admin.tsx",
    lineNumber: 210,
    columnNumber: 10
  }, this);
}
_s(AdminPage, "v7kV4yaxs0Nb2wwLWQibDM++W+g=", false, function() {
  return [useLoaderData, useActionData, useRevalidator];
});
_c = AdminPage;
function OrderCard({
  order,
  onStatusUpdate,
  onPaymentUpdate
}) {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "border border-ivory-200 rounded-lg p-4 bg-white", children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex justify-between items-start mb-3", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { className: "font-semibold text-warm-brown-900", children: order.customer_name }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 357,
          columnNumber: 11
        }, this),
        order.church_group && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { className: "text-sm text-warm-brown-600", children: order.church_group }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 360,
          columnNumber: 34
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { className: "text-sm text-warm-brown-500", children: new Date(order.created_at).toLocaleTimeString() }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 363,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 356,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`, children: order.status }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 367,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 355,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "space-y-2 mb-3", children: order.order_items.map((item) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex justify-between text-sm", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: [
        item.menu.name,
        " \xD7 ",
        item.quantity
      ] }, void 0, true, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 374,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: [
        "\u20A9",
        (item.unit_price * item.quantity).toLocaleString()
      ] }, void 0, true, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 375,
        columnNumber: 13
      }, this)
    ] }, item.id, true, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 373,
      columnNumber: 40
    }, this)) }, void 0, false, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 372,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "border-t border-ivory-200 pt-3", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex justify-between items-center mb-2", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "font-semibold", children: "\uCD1D \uAE08\uC561" }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 381,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "font-semibold text-wine-red-600", children: [
          "\u20A9",
          order.total_amount.toLocaleString()
        ] }, void 0, true, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 382,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 380,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex space-x-2 mb-3", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("select", { value: order.status, onChange: (e) => onStatusUpdate(order.id, e.target.value), className: "flex-1 text-sm border border-ivory-300 rounded px-2 py-1", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "pending", children: "\uB300\uAE30 \uC911" }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 389,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "preparing", children: "\uC81C\uC870 \uC911" }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 390,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "ready", children: "\uC644\uB8CC" }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 391,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "completed", children: "\uD53D\uC5C5 \uC644\uB8CC" }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 392,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "cancelled", children: "\uCDE8\uC18C" }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 393,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 388,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 387,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex space-x-2", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("select", { value: order.payment_status, onChange: (e) => onPaymentUpdate(order.id, e.target.value), className: "flex-1 text-sm border border-ivory-300 rounded px-2 py-1", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "pending", children: "\uACB0\uC81C \uB300\uAE30" }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 399,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "confirmed", children: "\uACB0\uC81C \uC644\uB8CC" }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 400,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 398,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 397,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 379,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/admin.tsx",
    lineNumber: 354,
    columnNumber: 10
  }, this);
}
_c2 = OrderCard;
function MenuForm({
  menu,
  onSubmit
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("action", menu ? "updateMenu" : "addMenu");
    if (menu) {
      formData.append("id", menu.id);
    }
    onSubmit(formData);
  };
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { className: "block text-sm font-medium text-warm-brown-700 mb-1", children: "\uBA54\uB274\uBA85" }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 422,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "text", name: "name", defaultValue: menu?.name, required: true, className: "input-field" }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 425,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 421,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { className: "block text-sm font-medium text-warm-brown-700 mb-1", children: "\uC124\uBA85" }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 429,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("textarea", { name: "description", defaultValue: menu?.description, className: "input-field", rows: 2 }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 432,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 428,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "grid grid-cols-2 gap-4", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { className: "block text-sm font-medium text-warm-brown-700 mb-1", children: "\uAC00\uACA9" }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 437,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "number", name: "price", defaultValue: menu?.price, required: true, min: "0", step: "100", className: "input-field" }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 440,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 436,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { className: "block text-sm font-medium text-warm-brown-700 mb-1", children: "\uCE74\uD14C\uACE0\uB9AC" }, void 0, false, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 444,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("select", { name: "category", defaultValue: menu?.category, required: true, className: "input-field", children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "", children: "\uC120\uD0DD\uD558\uC138\uC694" }, void 0, false, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 448,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "coffee", children: "\uCEE4\uD53C" }, void 0, false, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 449,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "tea", children: "\uCC28" }, void 0, false, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 450,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "juice", children: "\uC8FC\uC2A4" }, void 0, false, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 451,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "smoothie", children: "\uC2A4\uBB34\uB514" }, void 0, false, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 452,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "beverage", children: "\uC74C\uB8CC" }, void 0, false, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 453,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 447,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 443,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 435,
      columnNumber: 7
    }, this),
    menu && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { className: "flex items-center", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "checkbox", name: "is_available", value: "true", defaultChecked: menu.is_available, className: "mr-2" }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 460,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "text-sm text-warm-brown-700", children: "\uD310\uB9E4 \uAC00\uB2A5" }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 461,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 459,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 458,
      columnNumber: 16
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { type: "submit", className: "btn-primary", children: menu ? "\uC218\uC815" : "\uCD94\uAC00" }, void 0, false, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 465,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/admin.tsx",
    lineNumber: 420,
    columnNumber: 10
  }, this);
}
_c3 = MenuForm;
function MenuCard({
  menu,
  onEdit,
  onUpdate
}) {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "border border-ivory-200 rounded-lg p-4 bg-white", children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex justify-between items-start mb-2", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { className: "font-semibold text-warm-brown-900", children: menu.name }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 478,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${menu.is_available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`, children: menu.is_available ? "\uD310\uB9E4\uC911" : "\uD488\uC808" }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 479,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 477,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { className: "text-sm text-warm-brown-600 mb-2", children: menu.description }, void 0, false, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 484,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { className: "text-lg font-bold text-wine-red-600 mb-3", children: [
      "\u20A9",
      menu.price.toLocaleString()
    ] }, void 0, true, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 485,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex space-x-2", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: onEdit, className: "btn-secondary flex-1", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PenSquare, { className: "w-4 h-4 mr-1" }, void 0, false, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 491,
        columnNumber: 11
      }, this),
      "\uC218\uC815"
    ] }, void 0, true, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 490,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 489,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/admin.tsx",
    lineNumber: 476,
    columnNumber: 10
  }, this);
}
_c4 = MenuCard;
var _c;
var _c2;
var _c3;
var _c4;
$RefreshReg$(_c, "AdminPage");
$RefreshReg$(_c2, "OrderCard");
$RefreshReg$(_c3, "MenuForm");
$RefreshReg$(_c4, "MenuCard");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  AdminPage as default
};
//# sourceMappingURL=/build/routes/admin-W33CBTNN.js.map
