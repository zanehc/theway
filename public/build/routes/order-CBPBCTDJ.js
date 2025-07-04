import {
  require_node,
  require_supabase
} from "/build/_shared/chunk-JNABDDE3.js";
import {
  Minus,
  Plus,
  ShoppingCart
} from "/build/_shared/chunk-JEVRW7VH.js";
import {
  Form,
  useActionData,
  useLoaderData
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

// app/routes/order.tsx
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
    window.$RefreshRuntime$.register(type, '"app/routes/order.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/order.tsx"
  );
  import.meta.hot.lastModified = "1751666668825.3745";
}
function OrderPage() {
  _s();
  const {
    menus
  } = useLoaderData();
  const actionData = useActionData();
  const [cart, setCart] = (0, import_react2.useState)([]);
  const [selectedCategory, setSelectedCategory] = (0, import_react2.useState)("all");
  const categories = ["all", ...new Set(menus.map((menu) => menu.category))];
  const filteredMenus = selectedCategory === "all" ? menus : menus.filter((menu) => menu.category === selectedCategory);
  const addToCart = (menu) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === menu.id);
      if (existing) {
        return prev.map((item) => item.id === menu.id ? {
          ...item,
          quantity: item.quantity + 1
        } : item);
      }
      return [...prev, {
        ...menu,
        quantity: 1
      }];
    });
  };
  const removeFromCart = (menuId) => {
    setCart((prev) => prev.filter((item) => item.id !== menuId));
  };
  const updateQuantity = (menuId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(menuId);
      return;
    }
    setCart((prev) => prev.map((item) => item.id === menuId ? {
      ...item,
      quantity
    } : item));
  };
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (actionData?.success) {
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "min-h-screen bg-ivory-50 flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "card max-w-md w-full text-center", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ShoppingCart, { className: "w-8 h-8 text-green-600" }, void 0, false, {
        fileName: "app/routes/order.tsx",
        lineNumber: 138,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/routes/order.tsx",
        lineNumber: 137,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { className: "text-2xl font-semibold text-warm-brown-900 mb-2", children: "\uC8FC\uBB38\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4!" }, void 0, false, {
        fileName: "app/routes/order.tsx",
        lineNumber: 140,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { className: "text-warm-brown-600 mb-6", children: [
        "\uC8FC\uBB38\uBC88\uD638: ",
        actionData.orderId
      ] }, void 0, true, {
        fileName: "app/routes/order.tsx",
        lineNumber: 143,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("a", { href: "/order", className: "btn-primary", children: "\uC0C8 \uC8FC\uBB38\uD558\uAE30" }, void 0, false, {
        fileName: "app/routes/order.tsx",
        lineNumber: 146,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/order.tsx",
      lineNumber: 136,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/routes/order.tsx",
      lineNumber: 135,
      columnNumber: 12
    }, this);
  }
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "min-h-screen bg-ivory-50", children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("header", { className: "bg-white shadow-sm border-b border-ivory-200", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex justify-between items-center h-16", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", { className: "text-xl font-semibold text-warm-brown-900", children: "\uC74C\uB8CC \uC8FC\uBB38" }, void 0, false, {
        fileName: "app/routes/order.tsx",
        lineNumber: 157,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex items-center space-x-2", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ShoppingCart, { className: "w-5 h-5 text-wine-red-600" }, void 0, false, {
          fileName: "app/routes/order.tsx",
          lineNumber: 161,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "text-sm font-medium text-warm-brown-700", children: [
          cart.length,
          "\uAC1C \uD56D\uBAA9"
        ] }, void 0, true, {
          fileName: "app/routes/order.tsx",
          lineNumber: 162,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/order.tsx",
        lineNumber: 160,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/order.tsx",
      lineNumber: 156,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/order.tsx",
      lineNumber: 155,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/routes/order.tsx",
      lineNumber: 154,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "grid lg:grid-cols-3 gap-8", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "lg:col-span-2", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "mb-6", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex flex-wrap gap-2", children: categories.map((category) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: () => setSelectedCategory(category), className: `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === category ? "bg-wine-red-600 text-white" : "bg-ivory-200 text-warm-brown-700 hover:bg-ivory-300"}`, children: category === "all" ? "\uC804\uCCB4" : category }, category, false, {
          fileName: "app/routes/order.tsx",
          lineNumber: 177,
          columnNumber: 45
        }, this)) }, void 0, false, {
          fileName: "app/routes/order.tsx",
          lineNumber: 176,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "app/routes/order.tsx",
          lineNumber: 175,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "grid md:grid-cols-2 gap-4", children: filteredMenus.map((menu) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "card hover:shadow-lg transition-shadow", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex justify-between items-start mb-3", children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { className: "font-semibold text-warm-brown-900 mb-1", children: menu.name }, void 0, false, {
              fileName: "app/routes/order.tsx",
              lineNumber: 188,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { className: "text-sm text-warm-brown-600 mb-2", children: menu.description }, void 0, false, {
              fileName: "app/routes/order.tsx",
              lineNumber: 191,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { className: "text-lg font-bold text-wine-red-600", children: [
              "\u20A9",
              menu.price.toLocaleString()
            ] }, void 0, true, {
              fileName: "app/routes/order.tsx",
              lineNumber: 194,
              columnNumber: 23
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/order.tsx",
            lineNumber: 187,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: () => addToCart(menu), className: "w-8 h-8 bg-wine-red-600 text-white rounded-full flex items-center justify-center hover:bg-wine-red-700 transition-colors", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "w-4 h-4" }, void 0, false, {
            fileName: "app/routes/order.tsx",
            lineNumber: 199,
            columnNumber: 23
          }, this) }, void 0, false, {
            fileName: "app/routes/order.tsx",
            lineNumber: 198,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/order.tsx",
          lineNumber: 186,
          columnNumber: 19
        }, this) }, menu.id, false, {
          fileName: "app/routes/order.tsx",
          lineNumber: 185,
          columnNumber: 42
        }, this)) }, void 0, false, {
          fileName: "app/routes/order.tsx",
          lineNumber: 184,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/order.tsx",
        lineNumber: 173,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "lg:col-span-1", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "card sticky top-8", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { className: "text-lg font-semibold text-warm-brown-900 mb-4", children: "\uC8FC\uBB38 \uB0B4\uC5ED" }, void 0, false, {
          fileName: "app/routes/order.tsx",
          lineNumber: 209,
          columnNumber: 15
        }, this),
        cart.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { className: "text-warm-brown-500 text-center py-8", children: "\uC8FC\uBB38\uD560 \uC74C\uB8CC\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694" }, void 0, false, {
          fileName: "app/routes/order.tsx",
          lineNumber: 213,
          columnNumber: 36
        }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "space-y-3 mb-6", children: cart.map((item) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex items-center justify-between p-3 bg-ivory-50 rounded-lg", children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex-1", children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { className: "font-medium text-warm-brown-900", children: item.name }, void 0, false, {
                fileName: "app/routes/order.tsx",
                lineNumber: 219,
                columnNumber: 27
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { className: "text-sm text-warm-brown-600", children: [
                "\u20A9",
                item.price.toLocaleString(),
                " \xD7 ",
                item.quantity
              ] }, void 0, true, {
                fileName: "app/routes/order.tsx",
                lineNumber: 222,
                columnNumber: 27
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/order.tsx",
              lineNumber: 218,
              columnNumber: 25
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex items-center space-x-2", children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: () => updateQuantity(item.id, item.quantity - 1), className: "w-6 h-6 bg-ivory-200 text-warm-brown-700 rounded flex items-center justify-center hover:bg-ivory-300", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Minus, { className: "w-3 h-3" }, void 0, false, {
                fileName: "app/routes/order.tsx",
                lineNumber: 228,
                columnNumber: 29
              }, this) }, void 0, false, {
                fileName: "app/routes/order.tsx",
                lineNumber: 227,
                columnNumber: 27
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "w-8 text-center font-medium", children: item.quantity }, void 0, false, {
                fileName: "app/routes/order.tsx",
                lineNumber: 230,
                columnNumber: 27
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: () => updateQuantity(item.id, item.quantity + 1), className: "w-6 h-6 bg-wine-red-600 text-white rounded flex items-center justify-center hover:bg-wine-red-700", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "w-3 h-3" }, void 0, false, {
                fileName: "app/routes/order.tsx",
                lineNumber: 234,
                columnNumber: 29
              }, this) }, void 0, false, {
                fileName: "app/routes/order.tsx",
                lineNumber: 233,
                columnNumber: 27
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/order.tsx",
              lineNumber: 226,
              columnNumber: 25
            }, this)
          ] }, item.id, true, {
            fileName: "app/routes/order.tsx",
            lineNumber: 217,
            columnNumber: 39
          }, this)) }, void 0, false, {
            fileName: "app/routes/order.tsx",
            lineNumber: 216,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "border-t border-ivory-200 pt-4 mb-6", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex justify-between items-center text-lg font-semibold", children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "\uCD1D \uAE08\uC561" }, void 0, false, {
              fileName: "app/routes/order.tsx",
              lineNumber: 242,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "text-wine-red-600", children: [
              "\u20A9",
              totalAmount.toLocaleString()
            ] }, void 0, true, {
              fileName: "app/routes/order.tsx",
              lineNumber: 243,
              columnNumber: 23
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/order.tsx",
            lineNumber: 241,
            columnNumber: 21
          }, this) }, void 0, false, {
            fileName: "app/routes/order.tsx",
            lineNumber: 240,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Form, { method: "post", children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "hidden", name: "cartItems", value: JSON.stringify(cart) }, void 0, false, {
              fileName: "app/routes/order.tsx",
              lineNumber: 251,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "hidden", name: "totalAmount", value: totalAmount }, void 0, false, {
              fileName: "app/routes/order.tsx",
              lineNumber: 252,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "space-y-4", children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { className: "block text-sm font-medium text-warm-brown-700 mb-2", children: "\uACE0\uAC1D\uBA85 *" }, void 0, false, {
                  fileName: "app/routes/order.tsx",
                  lineNumber: 256,
                  columnNumber: 25
                }, this),
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "text", name: "customerName", required: true, className: "input-field", placeholder: "\uACE0\uAC1D\uBA85\uC744 \uC785\uB825\uD558\uC138\uC694" }, void 0, false, {
                  fileName: "app/routes/order.tsx",
                  lineNumber: 259,
                  columnNumber: 25
                }, this)
              ] }, void 0, true, {
                fileName: "app/routes/order.tsx",
                lineNumber: 255,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { className: "block text-sm font-medium text-warm-brown-700 mb-2", children: "\uBAA9\uC7A5 (\uC120\uD0DD\uC0AC\uD56D)" }, void 0, false, {
                  fileName: "app/routes/order.tsx",
                  lineNumber: 263,
                  columnNumber: 25
                }, this),
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "text", name: "churchGroup", className: "input-field", placeholder: "\uBAA9\uC7A5\uBA85\uC744 \uC785\uB825\uD558\uC138\uC694" }, void 0, false, {
                  fileName: "app/routes/order.tsx",
                  lineNumber: 266,
                  columnNumber: 25
                }, this)
              ] }, void 0, true, {
                fileName: "app/routes/order.tsx",
                lineNumber: 262,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { className: "block text-sm font-medium text-warm-brown-700 mb-2", children: "\uACB0\uC81C \uBC29\uBC95 *" }, void 0, false, {
                  fileName: "app/routes/order.tsx",
                  lineNumber: 270,
                  columnNumber: 25
                }, this),
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("select", { name: "paymentMethod", required: true, className: "input-field", children: [
                  /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "", children: "\uACB0\uC81C \uBC29\uBC95\uC744 \uC120\uD0DD\uD558\uC138\uC694" }, void 0, false, {
                    fileName: "app/routes/order.tsx",
                    lineNumber: 274,
                    columnNumber: 27
                  }, this),
                  /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "cash", children: "\uD604\uAE08" }, void 0, false, {
                    fileName: "app/routes/order.tsx",
                    lineNumber: 275,
                    columnNumber: 27
                  }, this),
                  /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "transfer", children: "\uACC4\uC88C\uC774\uCCB4" }, void 0, false, {
                    fileName: "app/routes/order.tsx",
                    lineNumber: 276,
                    columnNumber: 27
                  }, this)
                ] }, void 0, true, {
                  fileName: "app/routes/order.tsx",
                  lineNumber: 273,
                  columnNumber: 25
                }, this)
              ] }, void 0, true, {
                fileName: "app/routes/order.tsx",
                lineNumber: 269,
                columnNumber: 23
              }, this),
              actionData?.error && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "text-red-600 text-sm bg-red-50 p-3 rounded-lg", children: actionData.error }, void 0, false, {
                fileName: "app/routes/order.tsx",
                lineNumber: 280,
                columnNumber: 45
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { type: "submit", className: "w-full btn-primary py-3", disabled: cart.length === 0, children: "\uC8FC\uBB38 \uC644\uB8CC" }, void 0, false, {
                fileName: "app/routes/order.tsx",
                lineNumber: 284,
                columnNumber: 23
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/order.tsx",
              lineNumber: 254,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/order.tsx",
            lineNumber: 250,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/order.tsx",
          lineNumber: 215,
          columnNumber: 24
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/order.tsx",
        lineNumber: 208,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/routes/order.tsx",
        lineNumber: 207,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/order.tsx",
      lineNumber: 171,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/routes/order.tsx",
      lineNumber: 170,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/order.tsx",
    lineNumber: 152,
    columnNumber: 10
  }, this);
}
_s(OrderPage, "cZFUoAbx7VPNiE/C3ouI1IMTTAw=", false, function() {
  return [useLoaderData, useActionData];
});
_c = OrderPage;
var _c;
$RefreshReg$(_c, "OrderPage");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  OrderPage as default
};
//# sourceMappingURL=/build/routes/order-CBPBCTDJ.js.map
