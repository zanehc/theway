var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: !0 });
};

// node_modules/@remix-run/dev/dist/config/defaults/entry.server.node.tsx
var entry_server_node_exports = {};
__export(entry_server_node_exports, {
  default: () => handleRequest
});
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import * as isbotModule from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { jsxDEV } from "react/jsx-dev-runtime";
var ABORT_DELAY = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, remixContext, loadContext) {
  return isBotRequest(request.headers.get("user-agent")) || remixContext.isSpaMode ? handleBotRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  ) : handleBrowserRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  );
}
function isBotRequest(userAgent) {
  return userAgent ? "isbot" in isbotModule && typeof isbotModule.isbot == "function" ? isbotModule.isbot(userAgent) : "default" in isbotModule && typeof isbotModule.default == "function" ? isbotModule.default(userAgent) : !1 : !1;
}
function handleBotRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = !1, { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsxDEV(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        },
        void 0,
        !1,
        {
          fileName: "node_modules/@remix-run/dev/dist/config/defaults/entry.server.node.tsx",
          lineNumber: 66,
          columnNumber: 7
        },
        this
      ),
      {
        onAllReady() {
          shellRendered = !0;
          let body = new PassThrough(), stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html"), resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          ), pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500, shellRendered && console.error(error);
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
function handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = !1, { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsxDEV(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        },
        void 0,
        !1,
        {
          fileName: "node_modules/@remix-run/dev/dist/config/defaults/entry.server.node.tsx",
          lineNumber: 116,
          columnNumber: 7
        },
        this
      ),
      {
        onShellReady() {
          shellRendered = !0;
          let body = new PassThrough(), stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html"), resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          ), pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500, shellRendered && console.error(error);
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}

// app/root.tsx
var root_exports = {};
__export(root_exports, {
  default: () => App,
  links: () => links,
  meta: () => meta
});
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration
} from "@remix-run/react";

// app/tailwind.css
var tailwind_default = "/build/_assets/tailwind-CKL7PSWM.css";

// app/root.tsx
import { jsxDEV as jsxDEV2 } from "react/jsx-dev-runtime";
var links = () => [
  { rel: "stylesheet", href: tailwind_default },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
  }
], meta = () => [
  { title: "\uAD50\uD68C \uCE74\uD398 \uC8FC\uBB38 \uC2DC\uC2A4\uD15C" },
  { name: "description", content: "\uAD50\uD68C \uCE74\uD398\uB97C \uC704\uD55C \uD6A8\uC728\uC801\uC778 \uC8FC\uBB38 \uBC0F \uAD00\uB9AC \uC2DC\uC2A4\uD15C" },
  { name: "viewport", content: "width=device-width,initial-scale=1" }
];
function App() {
  return /* @__PURE__ */ jsxDEV2("html", { lang: "ko", className: "h-full", children: [
    /* @__PURE__ */ jsxDEV2("head", { children: [
      /* @__PURE__ */ jsxDEV2(Meta, {}, void 0, !1, {
        fileName: "app/root.tsx",
        lineNumber: 34,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV2(Links, {}, void 0, !1, {
        fileName: "app/root.tsx",
        lineNumber: 35,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/root.tsx",
      lineNumber: 33,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV2("body", { className: "h-full bg-ivory-50 font-sans", children: [
      /* @__PURE__ */ jsxDEV2(Outlet, {}, void 0, !1, {
        fileName: "app/root.tsx",
        lineNumber: 38,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV2(ScrollRestoration, {}, void 0, !1, {
        fileName: "app/root.tsx",
        lineNumber: 39,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV2(Scripts, {}, void 0, !1, {
        fileName: "app/root.tsx",
        lineNumber: 40,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV2(LiveReload, {}, void 0, !1, {
        fileName: "app/root.tsx",
        lineNumber: 41,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/root.tsx",
      lineNumber: 37,
      columnNumber: 7
    }, this)
  ] }, void 0, !0, {
    fileName: "app/root.tsx",
    lineNumber: 32,
    columnNumber: 5
  }, this);
}

// app/routes/_index.tsx
var index_exports = {};
__export(index_exports, {
  default: () => Index,
  meta: () => meta2
});
import { Link } from "@remix-run/react";
import { Coffee, Users, BarChart3, Settings } from "lucide-react";
import { jsxDEV as jsxDEV3 } from "react/jsx-dev-runtime";
var meta2 = () => [
  { title: "\uAD50\uD68C \uCE74\uD398 \uC8FC\uBB38 \uC2DC\uC2A4\uD15C - \uD648" },
  { name: "description", content: "\uAD50\uD68C \uCE74\uD398\uB97C \uC704\uD55C \uD6A8\uC728\uC801\uC778 \uC8FC\uBB38 \uBC0F \uAD00\uB9AC \uC2DC\uC2A4\uD15C" }
];
function Index() {
  return /* @__PURE__ */ jsxDEV3("div", { className: "min-h-screen bg-gradient-to-br from-ivory-50 to-warm-brown-50", children: [
    /* @__PURE__ */ jsxDEV3("header", { className: "bg-white shadow-sm border-b border-ivory-200", children: /* @__PURE__ */ jsxDEV3("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxDEV3("div", { className: "flex justify-between items-center h-16", children: [
      /* @__PURE__ */ jsxDEV3("div", { className: "flex items-center space-x-3", children: [
        /* @__PURE__ */ jsxDEV3("div", { className: "w-8 h-8 bg-wine-red-600 rounded-lg flex items-center justify-center", children: /* @__PURE__ */ jsxDEV3(Coffee, { className: "w-5 h-5 text-white" }, void 0, !1, {
          fileName: "app/routes/_index.tsx",
          lineNumber: 21,
          columnNumber: 17
        }, this) }, void 0, !1, {
          fileName: "app/routes/_index.tsx",
          lineNumber: 20,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV3("h1", { className: "text-xl font-semibold text-warm-brown-900", children: "\uAD50\uD68C \uCE74\uD398 \uC8FC\uBB38 \uC2DC\uC2A4\uD15C" }, void 0, !1, {
          fileName: "app/routes/_index.tsx",
          lineNumber: 23,
          columnNumber: 15
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/_index.tsx",
        lineNumber: 19,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV3("nav", { className: "flex space-x-4", children: /* @__PURE__ */ jsxDEV3(
        Link,
        {
          to: "/login",
          className: "text-warm-brown-600 hover:text-wine-red-600 transition-colors",
          children: "\uB85C\uADF8\uC778"
        },
        void 0,
        !1,
        {
          fileName: "app/routes/_index.tsx",
          lineNumber: 28,
          columnNumber: 15
        },
        this
      ) }, void 0, !1, {
        fileName: "app/routes/_index.tsx",
        lineNumber: 27,
        columnNumber: 13
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/_index.tsx",
      lineNumber: 18,
      columnNumber: 11
    }, this) }, void 0, !1, {
      fileName: "app/routes/_index.tsx",
      lineNumber: 17,
      columnNumber: 9
    }, this) }, void 0, !1, {
      fileName: "app/routes/_index.tsx",
      lineNumber: 16,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV3("main", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12", children: [
      /* @__PURE__ */ jsxDEV3("div", { className: "text-center mb-16", children: [
        /* @__PURE__ */ jsxDEV3("h2", { className: "text-4xl font-bold text-warm-brown-900 mb-4", children: [
          "\uAD50\uD68C \uCE74\uD398\uB97C \uC704\uD55C",
          /* @__PURE__ */ jsxDEV3("br", {}, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 44,
            columnNumber: 22
          }, this),
          /* @__PURE__ */ jsxDEV3("span", { className: "text-wine-red-600", children: "\uC2A4\uB9C8\uD2B8\uD55C \uC8FC\uBB38 \uC2DC\uC2A4\uD15C" }, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 45,
            columnNumber: 13
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/_index.tsx",
          lineNumber: 43,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV3("p", { className: "text-lg text-warm-brown-600 max-w-2xl mx-auto", children: [
          "\uD6A8\uC728\uC801\uC778 \uC8FC\uBB38 \uAD00\uB9AC, \uC2E4\uC2DC\uAC04 \uD604\uD669\uD310, \uADF8\uB9AC\uACE0 \uC0C1\uC138\uD55C \uB9E4\uCD9C \uBD84\uC11D\uAE4C\uC9C0.",
          /* @__PURE__ */ jsxDEV3("br", {}, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 48,
            columnNumber: 50
          }, this),
          "\uAD50\uD68C \uCE74\uD398 \uC6B4\uC601\uC744 \uB354\uC6B1 \uD3B8\uB9AC\uD558\uACE0 \uCCB4\uACC4\uC801\uC73C\uB85C \uB9CC\uB4E4\uC5B4\uBCF4\uC138\uC694."
        ] }, void 0, !0, {
          fileName: "app/routes/_index.tsx",
          lineNumber: 47,
          columnNumber: 11
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/_index.tsx",
        lineNumber: 42,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV3("div", { className: "grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16", children: [
        /* @__PURE__ */ jsxDEV3("div", { className: "card text-center hover:shadow-lg transition-shadow", children: [
          /* @__PURE__ */ jsxDEV3("div", { className: "w-12 h-12 bg-wine-red-100 rounded-lg flex items-center justify-center mx-auto mb-4", children: /* @__PURE__ */ jsxDEV3(Coffee, { className: "w-6 h-6 text-wine-red-600" }, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 57,
            columnNumber: 15
          }, this) }, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 56,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV3("h3", { className: "text-lg font-semibold text-warm-brown-900 mb-2", children: "\uBE60\uB978 \uC8FC\uBB38 \uC811\uC218" }, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 59,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV3("p", { className: "text-warm-brown-600 text-sm", children: "\uC9C1\uAD00\uC801\uC778 \uC778\uD130\uD398\uC774\uC2A4\uB85C \uBE60\uB974\uACE0 \uC815\uD655\uD55C \uC8FC\uBB38 \uC811\uC218" }, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 62,
            columnNumber: 13
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/_index.tsx",
          lineNumber: 55,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV3("div", { className: "card text-center hover:shadow-lg transition-shadow", children: [
          /* @__PURE__ */ jsxDEV3("div", { className: "w-12 h-12 bg-ivory-100 rounded-lg flex items-center justify-center mx-auto mb-4", children: /* @__PURE__ */ jsxDEV3(Users, { className: "w-6 h-6 text-warm-brown-600" }, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 69,
            columnNumber: 15
          }, this) }, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 68,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV3("h3", { className: "text-lg font-semibold text-warm-brown-900 mb-2", children: "\uC2E4\uC2DC\uAC04 \uD604\uD669\uD310" }, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 71,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV3("p", { className: "text-warm-brown-600 text-sm", children: "\uC8FC\uBB38 \uC0C1\uD0DC\uB97C \uD55C\uB208\uC5D0 \uD655\uC778\uD560 \uC218 \uC788\uB294 \uC2E4\uC2DC\uAC04 \uD604\uD669\uD310" }, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 74,
            columnNumber: 13
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/_index.tsx",
          lineNumber: 67,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV3("div", { className: "card text-center hover:shadow-lg transition-shadow", children: [
          /* @__PURE__ */ jsxDEV3("div", { className: "w-12 h-12 bg-warm-brown-100 rounded-lg flex items-center justify-center mx-auto mb-4", children: /* @__PURE__ */ jsxDEV3(BarChart3, { className: "w-6 h-6 text-warm-brown-600" }, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 81,
            columnNumber: 15
          }, this) }, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 80,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV3("h3", { className: "text-lg font-semibold text-warm-brown-900 mb-2", children: "\uB9E4\uCD9C \uBD84\uC11D" }, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 83,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV3("p", { className: "text-warm-brown-600 text-sm", children: "\uC77C\uBCC4, \uC8FC\uBCC4, \uC6D4\uBCC4 \uB9E4\uCD9C \uD604\uD669\uACFC \uC778\uAE30 \uBA54\uB274 \uBD84\uC11D" }, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 86,
            columnNumber: 13
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/_index.tsx",
          lineNumber: 79,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV3("div", { className: "card text-center hover:shadow-lg transition-shadow", children: [
          /* @__PURE__ */ jsxDEV3("div", { className: "w-12 h-12 bg-ivory-100 rounded-lg flex items-center justify-center mx-auto mb-4", children: /* @__PURE__ */ jsxDEV3(Settings, { className: "w-6 h-6 text-warm-brown-600" }, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 93,
            columnNumber: 15
          }, this) }, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 92,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV3("h3", { className: "text-lg font-semibold text-warm-brown-900 mb-2", children: "\uBA54\uB274 \uAD00\uB9AC" }, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 95,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV3("p", { className: "text-warm-brown-600 text-sm", children: "\uBA54\uB274 \uCD94\uAC00, \uC218\uC815, \uC0AD\uC81C\uB97C \uC704\uD55C \uD3B8\uB9AC\uD55C \uAD00\uB9AC \uB3C4\uAD6C" }, void 0, !1, {
            fileName: "app/routes/_index.tsx",
            lineNumber: 98,
            columnNumber: 13
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/_index.tsx",
          lineNumber: 91,
          columnNumber: 11
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/_index.tsx",
        lineNumber: 54,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV3("div", { className: "text-center", children: /* @__PURE__ */ jsxDEV3("div", { className: "card max-w-2xl mx-auto", children: [
        /* @__PURE__ */ jsxDEV3("h3", { className: "text-2xl font-semibold text-warm-brown-900 mb-4", children: "\uC9C0\uAE08 \uC2DC\uC791\uD574\uBCF4\uC138\uC694" }, void 0, !1, {
          fileName: "app/routes/_index.tsx",
          lineNumber: 107,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV3("p", { className: "text-warm-brown-600 mb-6", children: "\uAD50\uD68C \uCE74\uD398 \uC6B4\uC601\uC744 \uB354\uC6B1 \uD6A8\uC728\uC801\uC73C\uB85C \uB9CC\uB4E4\uC5B4\uBCF4\uC138\uC694." }, void 0, !1, {
          fileName: "app/routes/_index.tsx",
          lineNumber: 110,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV3("div", { className: "flex flex-col sm:flex-row gap-4 justify-center", children: [
          /* @__PURE__ */ jsxDEV3(
            Link,
            {
              to: "/order",
              className: "btn-primary inline-flex items-center justify-center",
              children: "\uC8FC\uBB38\uD558\uAE30"
            },
            void 0,
            !1,
            {
              fileName: "app/routes/_index.tsx",
              lineNumber: 114,
              columnNumber: 15
            },
            this
          ),
          /* @__PURE__ */ jsxDEV3(
            Link,
            {
              to: "/admin",
              className: "btn-secondary inline-flex items-center justify-center",
              children: "\uAD00\uB9AC\uC790 \uD398\uC774\uC9C0"
            },
            void 0,
            !1,
            {
              fileName: "app/routes/_index.tsx",
              lineNumber: 120,
              columnNumber: 15
            },
            this
          )
        ] }, void 0, !0, {
          fileName: "app/routes/_index.tsx",
          lineNumber: 113,
          columnNumber: 13
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/_index.tsx",
        lineNumber: 106,
        columnNumber: 11
      }, this) }, void 0, !1, {
        fileName: "app/routes/_index.tsx",
        lineNumber: 105,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/_index.tsx",
      lineNumber: 40,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV3("footer", { className: "bg-warm-brown-900 text-white mt-16", children: /* @__PURE__ */ jsxDEV3("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: /* @__PURE__ */ jsxDEV3("div", { className: "text-center", children: /* @__PURE__ */ jsxDEV3("p", { className: "text-ivory-300", children: "\xA9 2024 \uAD50\uD68C \uCE74\uD398 \uC8FC\uBB38 \uC2DC\uC2A4\uD15C. \uBAA8\uB4E0 \uAD8C\uB9AC \uBCF4\uC720." }, void 0, !1, {
      fileName: "app/routes/_index.tsx",
      lineNumber: 135,
      columnNumber: 13
    }, this) }, void 0, !1, {
      fileName: "app/routes/_index.tsx",
      lineNumber: 134,
      columnNumber: 11
    }, this) }, void 0, !1, {
      fileName: "app/routes/_index.tsx",
      lineNumber: 133,
      columnNumber: 9
    }, this) }, void 0, !1, {
      fileName: "app/routes/_index.tsx",
      lineNumber: 132,
      columnNumber: 7
    }, this)
  ] }, void 0, !0, {
    fileName: "app/routes/_index.tsx",
    lineNumber: 14,
    columnNumber: 5
  }, this);
}

// app/routes/admin.tsx
var admin_exports = {};
__export(admin_exports, {
  action: () => action,
  default: () => AdminPage,
  loader: () => loader
});
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useRevalidator } from "@remix-run/react";
import { useState } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Coffee as Coffee2,
  Users as Users2,
  Settings as Settings2
} from "lucide-react";
import { supabase } from "~/lib/supabase.server";
import { jsxDEV as jsxDEV4 } from "react/jsx-dev-runtime";
async function loader({ request }) {
  let { data: orders } = await supabase.from("orders").select(`
      *,
      order_items (
        id,
        quantity,
        unit_price,
        menu:menus (name)
      )
    `).order("created_at", { ascending: !1 }), { data: menus } = await supabase.from("menus").select("*").order("category", { ascending: !0 });
  return json({
    orders: orders || [],
    menus: menus || []
  });
}
async function action({ request }) {
  let formData = await request.formData(), action4 = formData.get("action");
  if (action4 === "updateOrderStatus") {
    let orderId = formData.get("orderId"), status = formData.get("status"), { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error)
      return json({ error: "\uC8FC\uBB38 \uC0C1\uD0DC \uC5C5\uB370\uC774\uD2B8 \uC2E4\uD328" }, { status: 500 });
  }
  if (action4 === "updatePaymentStatus") {
    let orderId = formData.get("orderId"), paymentStatus = formData.get("paymentStatus"), { error } = await supabase.from("orders").update({ payment_status: paymentStatus }).eq("id", orderId);
    if (error)
      return json({ error: "\uACB0\uC81C \uC0C1\uD0DC \uC5C5\uB370\uC774\uD2B8 \uC2E4\uD328" }, { status: 500 });
  }
  if (action4 === "addMenu") {
    let name = formData.get("name"), description = formData.get("description"), price = parseFloat(formData.get("price")), category = formData.get("category"), { error } = await supabase.from("menus").insert({
      name,
      description,
      price,
      category,
      is_available: !0
    });
    if (error)
      return json({ error: "\uBA54\uB274 \uCD94\uAC00 \uC2E4\uD328" }, { status: 500 });
  }
  if (action4 === "updateMenu") {
    let id = formData.get("id"), name = formData.get("name"), description = formData.get("description"), price = parseFloat(formData.get("price")), category = formData.get("category"), is_available = formData.get("is_available") === "true", { error } = await supabase.from("menus").update({
      name,
      description,
      price,
      category,
      is_available
    }).eq("id", id);
    if (error)
      return json({ error: "\uBA54\uB274 \uC218\uC815 \uC2E4\uD328" }, { status: 500 });
  }
  return json({ success: !0 });
}
function AdminPage() {
  let { orders, menus } = useLoaderData(), actionData = useActionData(), revalidator = useRevalidator(), [activeTab, setActiveTab] = useState("orders"), [editingMenu, setEditingMenu] = useState(null), pendingOrders = orders.filter((order) => order.status === "pending"), preparingOrders = orders.filter((order) => order.status === "preparing"), readyOrders = orders.filter((order) => order.status === "ready"), getStatusColor2 = (status) => {
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
  }, getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return /* @__PURE__ */ jsxDEV4(Clock, { className: "w-4 h-4" }, void 0, !1, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 180,
          columnNumber: 30
        }, this);
      case "preparing":
        return /* @__PURE__ */ jsxDEV4(Coffee2, { className: "w-4 h-4" }, void 0, !1, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 181,
          columnNumber: 32
        }, this);
      case "ready":
        return /* @__PURE__ */ jsxDEV4(CheckCircle, { className: "w-4 h-4" }, void 0, !1, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 182,
          columnNumber: 28
        }, this);
      case "completed":
        return /* @__PURE__ */ jsxDEV4(CheckCircle, { className: "w-4 h-4" }, void 0, !1, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 183,
          columnNumber: 32
        }, this);
      case "cancelled":
        return /* @__PURE__ */ jsxDEV4(XCircle, { className: "w-4 h-4" }, void 0, !1, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 184,
          columnNumber: 32
        }, this);
      default:
        return /* @__PURE__ */ jsxDEV4(Clock, { className: "w-4 h-4" }, void 0, !1, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 185,
          columnNumber: 23
        }, this);
    }
  }, handleStatusUpdate = async (orderId, status) => {
    let formData = new FormData();
    formData.append("action", "updateOrderStatus"), formData.append("orderId", orderId), formData.append("status", status), await fetch("/admin", { method: "POST", body: formData }), revalidator.revalidate();
  }, handlePaymentUpdate = async (orderId, paymentStatus) => {
    let formData = new FormData();
    formData.append("action", "updatePaymentStatus"), formData.append("orderId", orderId), formData.append("paymentStatus", paymentStatus), await fetch("/admin", { method: "POST", body: formData }), revalidator.revalidate();
  };
  return /* @__PURE__ */ jsxDEV4("div", { className: "min-h-screen bg-ivory-50", children: [
    /* @__PURE__ */ jsxDEV4("header", { className: "bg-white shadow-sm border-b border-ivory-200", children: /* @__PURE__ */ jsxDEV4("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxDEV4("div", { className: "flex justify-between items-center h-16", children: [
      /* @__PURE__ */ jsxDEV4("h1", { className: "text-xl font-semibold text-warm-brown-900", children: "\uAD00\uB9AC\uC790 \uB300\uC2DC\uBCF4\uB4DC" }, void 0, !1, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 215,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV4("div", { className: "flex items-center space-x-4", children: /* @__PURE__ */ jsxDEV4("span", { className: "text-sm text-warm-brown-600", children: [
        "\uCD1D \uC8FC\uBB38: ",
        orders.length,
        "\uAC1C"
      ] }, void 0, !0, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 219,
        columnNumber: 15
      }, this) }, void 0, !1, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 218,
        columnNumber: 13
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 214,
      columnNumber: 11
    }, this) }, void 0, !1, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 213,
      columnNumber: 9
    }, this) }, void 0, !1, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 212,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV4("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [
      /* @__PURE__ */ jsxDEV4("div", { className: "mb-8", children: /* @__PURE__ */ jsxDEV4("div", { className: "flex space-x-1 bg-ivory-200 p-1 rounded-lg", children: [
        /* @__PURE__ */ jsxDEV4(
          "button",
          {
            onClick: () => setActiveTab("orders"),
            className: `flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "orders" ? "bg-white text-wine-red-600 shadow-sm" : "text-warm-brown-600 hover:text-warm-brown-900"}`,
            children: [
              /* @__PURE__ */ jsxDEV4(Users2, { className: "w-4 h-4" }, void 0, !1, {
                fileName: "app/routes/admin.tsx",
                lineNumber: 239,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV4("span", { children: "\uC8FC\uBB38 \uD604\uD669" }, void 0, !1, {
                fileName: "app/routes/admin.tsx",
                lineNumber: 240,
                columnNumber: 15
              }, this)
            ]
          },
          void 0,
          !0,
          {
            fileName: "app/routes/admin.tsx",
            lineNumber: 231,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV4(
          "button",
          {
            onClick: () => setActiveTab("menus"),
            className: `flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "menus" ? "bg-white text-wine-red-600 shadow-sm" : "text-warm-brown-600 hover:text-warm-brown-900"}`,
            children: [
              /* @__PURE__ */ jsxDEV4(Settings2, { className: "w-4 h-4" }, void 0, !1, {
                fileName: "app/routes/admin.tsx",
                lineNumber: 250,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV4("span", { children: "\uBA54\uB274 \uAD00\uB9AC" }, void 0, !1, {
                fileName: "app/routes/admin.tsx",
                lineNumber: 251,
                columnNumber: 15
              }, this)
            ]
          },
          void 0,
          !0,
          {
            fileName: "app/routes/admin.tsx",
            lineNumber: 242,
            columnNumber: 13
          },
          this
        )
      ] }, void 0, !0, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 230,
        columnNumber: 11
      }, this) }, void 0, !1, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 229,
        columnNumber: 9
      }, this),
      actionData?.error && /* @__PURE__ */ jsxDEV4("div", { className: "mb-6 text-red-600 text-sm bg-red-50 p-3 rounded-lg", children: actionData.error }, void 0, !1, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 257,
        columnNumber: 11
      }, this),
      activeTab === "orders" && /* @__PURE__ */ jsxDEV4("div", { className: "grid lg:grid-cols-3 gap-6", children: [
        /* @__PURE__ */ jsxDEV4("div", { className: "card", children: [
          /* @__PURE__ */ jsxDEV4("h3", { className: "text-lg font-semibold text-warm-brown-900 mb-4 flex items-center", children: [
            /* @__PURE__ */ jsxDEV4(Clock, { className: "w-5 h-5 text-yellow-600 mr-2" }, void 0, !1, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 267,
              columnNumber: 17
            }, this),
            "\uB300\uAE30 \uC911 (",
            pendingOrders.length,
            ")"
          ] }, void 0, !0, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 266,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV4("div", { className: "space-y-3", children: [
            pendingOrders.map((order) => /* @__PURE__ */ jsxDEV4(
              OrderCard,
              {
                order,
                onStatusUpdate: handleStatusUpdate,
                onPaymentUpdate: handlePaymentUpdate
              },
              order.id,
              !1,
              {
                fileName: "app/routes/admin.tsx",
                lineNumber: 272,
                columnNumber: 19
              },
              this
            )),
            pendingOrders.length === 0 && /* @__PURE__ */ jsxDEV4("p", { className: "text-warm-brown-500 text-center py-4", children: "\uB300\uAE30 \uC911\uC778 \uC8FC\uBB38\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }, void 0, !1, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 280,
              columnNumber: 19
            }, this)
          ] }, void 0, !0, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 270,
            columnNumber: 15
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 265,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV4("div", { className: "card", children: [
          /* @__PURE__ */ jsxDEV4("h3", { className: "text-lg font-semibold text-warm-brown-900 mb-4 flex items-center", children: [
            /* @__PURE__ */ jsxDEV4(Coffee2, { className: "w-5 h-5 text-blue-600 mr-2" }, void 0, !1, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 290,
              columnNumber: 17
            }, this),
            "\uC81C\uC870 \uC911 (",
            preparingOrders.length,
            ")"
          ] }, void 0, !0, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 289,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV4("div", { className: "space-y-3", children: [
            preparingOrders.map((order) => /* @__PURE__ */ jsxDEV4(
              OrderCard,
              {
                order,
                onStatusUpdate: handleStatusUpdate,
                onPaymentUpdate: handlePaymentUpdate
              },
              order.id,
              !1,
              {
                fileName: "app/routes/admin.tsx",
                lineNumber: 295,
                columnNumber: 19
              },
              this
            )),
            preparingOrders.length === 0 && /* @__PURE__ */ jsxDEV4("p", { className: "text-warm-brown-500 text-center py-4", children: "\uC81C\uC870 \uC911\uC778 \uC8FC\uBB38\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }, void 0, !1, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 303,
              columnNumber: 19
            }, this)
          ] }, void 0, !0, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 293,
            columnNumber: 15
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 288,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV4("div", { className: "card", children: [
          /* @__PURE__ */ jsxDEV4("h3", { className: "text-lg font-semibold text-warm-brown-900 mb-4 flex items-center", children: [
            /* @__PURE__ */ jsxDEV4(CheckCircle, { className: "w-5 h-5 text-green-600 mr-2" }, void 0, !1, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 313,
              columnNumber: 17
            }, this),
            "\uC644\uB8CC (",
            readyOrders.length,
            ")"
          ] }, void 0, !0, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 312,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV4("div", { className: "space-y-3", children: [
            readyOrders.map((order) => /* @__PURE__ */ jsxDEV4(
              OrderCard,
              {
                order,
                onStatusUpdate: handleStatusUpdate,
                onPaymentUpdate: handlePaymentUpdate
              },
              order.id,
              !1,
              {
                fileName: "app/routes/admin.tsx",
                lineNumber: 318,
                columnNumber: 19
              },
              this
            )),
            readyOrders.length === 0 && /* @__PURE__ */ jsxDEV4("p", { className: "text-warm-brown-500 text-center py-4", children: "\uC644\uB8CC\uB41C \uC8FC\uBB38\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }, void 0, !1, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 326,
              columnNumber: 19
            }, this)
          ] }, void 0, !0, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 316,
            columnNumber: 15
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 311,
          columnNumber: 13
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 263,
        columnNumber: 11
      }, this),
      activeTab === "menus" && /* @__PURE__ */ jsxDEV4("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsxDEV4("div", { className: "card", children: [
          /* @__PURE__ */ jsxDEV4("h3", { className: "text-lg font-semibold text-warm-brown-900 mb-4", children: "\uC0C8 \uBA54\uB274 \uCD94\uAC00" }, void 0, !1, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 339,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV4(
            MenuForm,
            {
              onSubmit: async (formData) => {
                await fetch("/admin", { method: "POST", body: formData }), revalidator.revalidate();
              }
            },
            void 0,
            !1,
            {
              fileName: "app/routes/admin.tsx",
              lineNumber: 342,
              columnNumber: 15
            },
            this
          )
        ] }, void 0, !0, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 338,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV4("div", { className: "card", children: [
          /* @__PURE__ */ jsxDEV4("h3", { className: "text-lg font-semibold text-warm-brown-900 mb-4", children: "\uBA54\uB274 \uBAA9\uB85D" }, void 0, !1, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 352,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV4("div", { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-4", children: menus.map((menu) => /* @__PURE__ */ jsxDEV4(
            MenuCard,
            {
              menu,
              onEdit: () => setEditingMenu(menu),
              onUpdate: async (formData) => {
                await fetch("/admin", { method: "POST", body: formData }), revalidator.revalidate(), setEditingMenu(null);
              }
            },
            menu.id,
            !1,
            {
              fileName: "app/routes/admin.tsx",
              lineNumber: 357,
              columnNumber: 19
            },
            this
          )) }, void 0, !1, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 355,
            columnNumber: 15
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 351,
          columnNumber: 13
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 336,
        columnNumber: 11
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 227,
      columnNumber: 7
    }, this),
    editingMenu && /* @__PURE__ */ jsxDEV4("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4", children: /* @__PURE__ */ jsxDEV4("div", { className: "bg-white rounded-lg p-6 max-w-md w-full", children: [
      /* @__PURE__ */ jsxDEV4("h3", { className: "text-lg font-semibold text-warm-brown-900 mb-4", children: "\uBA54\uB274 \uD3B8\uC9D1" }, void 0, !1, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 378,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV4(
        MenuForm,
        {
          menu: editingMenu,
          onSubmit: async (formData) => {
            await fetch("/admin", { method: "POST", body: formData }), revalidator.revalidate(), setEditingMenu(null);
          }
        },
        void 0,
        !1,
        {
          fileName: "app/routes/admin.tsx",
          lineNumber: 381,
          columnNumber: 13
        },
        this
      ),
      /* @__PURE__ */ jsxDEV4(
        "button",
        {
          onClick: () => setEditingMenu(null),
          className: "mt-4 w-full btn-secondary",
          children: "\uCDE8\uC18C"
        },
        void 0,
        !1,
        {
          fileName: "app/routes/admin.tsx",
          lineNumber: 389,
          columnNumber: 13
        },
        this
      )
    ] }, void 0, !0, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 377,
      columnNumber: 11
    }, this) }, void 0, !1, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 376,
      columnNumber: 9
    }, this)
  ] }, void 0, !0, {
    fileName: "app/routes/admin.tsx",
    lineNumber: 210,
    columnNumber: 5
  }, this);
}
function OrderCard({
  order,
  onStatusUpdate,
  onPaymentUpdate
}) {
  return /* @__PURE__ */ jsxDEV4("div", { className: "border border-ivory-200 rounded-lg p-4 bg-white", children: [
    /* @__PURE__ */ jsxDEV4("div", { className: "flex justify-between items-start mb-3", children: [
      /* @__PURE__ */ jsxDEV4("div", { children: [
        /* @__PURE__ */ jsxDEV4("h4", { className: "font-semibold text-warm-brown-900", children: order.customer_name }, void 0, !1, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 415,
          columnNumber: 11
        }, this),
        order.church_group && /* @__PURE__ */ jsxDEV4("p", { className: "text-sm text-warm-brown-600", children: order.church_group }, void 0, !1, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 419,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV4("p", { className: "text-sm text-warm-brown-500", children: new Date(order.created_at).toLocaleTimeString() }, void 0, !1, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 423,
          columnNumber: 11
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 414,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV4("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`, children: order.status }, void 0, !1, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 427,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 413,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV4("div", { className: "space-y-2 mb-3", children: order.order_items.map((item) => /* @__PURE__ */ jsxDEV4("div", { className: "flex justify-between text-sm", children: [
      /* @__PURE__ */ jsxDEV4("span", { children: [
        item.menu.name,
        " \xD7 ",
        item.quantity
      ] }, void 0, !0, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 435,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV4("span", { children: [
        "\u20A9",
        (item.unit_price * item.quantity).toLocaleString()
      ] }, void 0, !0, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 436,
        columnNumber: 13
      }, this)
    ] }, item.id, !0, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 434,
      columnNumber: 11
    }, this)) }, void 0, !1, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 432,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV4("div", { className: "border-t border-ivory-200 pt-3", children: [
      /* @__PURE__ */ jsxDEV4("div", { className: "flex justify-between items-center mb-2", children: [
        /* @__PURE__ */ jsxDEV4("span", { className: "font-semibold", children: "\uCD1D \uAE08\uC561" }, void 0, !1, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 443,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV4("span", { className: "font-semibold text-wine-red-600", children: [
          "\u20A9",
          order.total_amount.toLocaleString()
        ] }, void 0, !0, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 444,
          columnNumber: 11
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 442,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV4("div", { className: "flex space-x-2 mb-3", children: /* @__PURE__ */ jsxDEV4(
        "select",
        {
          value: order.status,
          onChange: (e) => onStatusUpdate(order.id, e.target.value),
          className: "flex-1 text-sm border border-ivory-300 rounded px-2 py-1",
          children: [
            /* @__PURE__ */ jsxDEV4("option", { value: "pending", children: "\uB300\uAE30 \uC911" }, void 0, !1, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 455,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV4("option", { value: "preparing", children: "\uC81C\uC870 \uC911" }, void 0, !1, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 456,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV4("option", { value: "ready", children: "\uC644\uB8CC" }, void 0, !1, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 457,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV4("option", { value: "completed", children: "\uD53D\uC5C5 \uC644\uB8CC" }, void 0, !1, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 458,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV4("option", { value: "cancelled", children: "\uCDE8\uC18C" }, void 0, !1, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 459,
              columnNumber: 13
            }, this)
          ]
        },
        void 0,
        !0,
        {
          fileName: "app/routes/admin.tsx",
          lineNumber: 450,
          columnNumber: 11
        },
        this
      ) }, void 0, !1, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 449,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV4("div", { className: "flex space-x-2", children: /* @__PURE__ */ jsxDEV4(
        "select",
        {
          value: order.payment_status,
          onChange: (e) => onPaymentUpdate(order.id, e.target.value),
          className: "flex-1 text-sm border border-ivory-300 rounded px-2 py-1",
          children: [
            /* @__PURE__ */ jsxDEV4("option", { value: "pending", children: "\uACB0\uC81C \uB300\uAE30" }, void 0, !1, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 469,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV4("option", { value: "confirmed", children: "\uACB0\uC81C \uC644\uB8CC" }, void 0, !1, {
              fileName: "app/routes/admin.tsx",
              lineNumber: 470,
              columnNumber: 13
            }, this)
          ]
        },
        void 0,
        !0,
        {
          fileName: "app/routes/admin.tsx",
          lineNumber: 464,
          columnNumber: 11
        },
        this
      ) }, void 0, !1, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 463,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 441,
      columnNumber: 7
    }, this)
  ] }, void 0, !0, {
    fileName: "app/routes/admin.tsx",
    lineNumber: 412,
    columnNumber: 5
  }, this);
}
function MenuForm({
  menu,
  onSubmit
}) {
  return /* @__PURE__ */ jsxDEV4("form", { onSubmit: (e) => {
    e.preventDefault();
    let formData = new FormData(e.currentTarget);
    formData.append("action", menu ? "updateMenu" : "addMenu"), menu && formData.append("id", menu.id), onSubmit(formData);
  }, className: "space-y-4", children: [
    /* @__PURE__ */ jsxDEV4("div", { children: [
      /* @__PURE__ */ jsxDEV4("label", { className: "block text-sm font-medium text-warm-brown-700 mb-1", children: "\uBA54\uB274\uBA85" }, void 0, !1, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 498,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV4(
        "input",
        {
          type: "text",
          name: "name",
          defaultValue: menu?.name,
          required: !0,
          className: "input-field"
        },
        void 0,
        !1,
        {
          fileName: "app/routes/admin.tsx",
          lineNumber: 501,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, !0, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 497,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV4("div", { children: [
      /* @__PURE__ */ jsxDEV4("label", { className: "block text-sm font-medium text-warm-brown-700 mb-1", children: "\uC124\uBA85" }, void 0, !1, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 511,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV4(
        "textarea",
        {
          name: "description",
          defaultValue: menu?.description,
          className: "input-field",
          rows: 2
        },
        void 0,
        !1,
        {
          fileName: "app/routes/admin.tsx",
          lineNumber: 514,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, !0, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 510,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV4("div", { className: "grid grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxDEV4("div", { children: [
        /* @__PURE__ */ jsxDEV4("label", { className: "block text-sm font-medium text-warm-brown-700 mb-1", children: "\uAC00\uACA9" }, void 0, !1, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 524,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV4(
          "input",
          {
            type: "number",
            name: "price",
            defaultValue: menu?.price,
            required: !0,
            min: "0",
            step: "100",
            className: "input-field"
          },
          void 0,
          !1,
          {
            fileName: "app/routes/admin.tsx",
            lineNumber: 527,
            columnNumber: 11
          },
          this
        )
      ] }, void 0, !0, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 523,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV4("div", { children: [
        /* @__PURE__ */ jsxDEV4("label", { className: "block text-sm font-medium text-warm-brown-700 mb-1", children: "\uCE74\uD14C\uACE0\uB9AC" }, void 0, !1, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 539,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV4("select", { name: "category", defaultValue: menu?.category, required: !0, className: "input-field", children: [
          /* @__PURE__ */ jsxDEV4("option", { value: "", children: "\uC120\uD0DD\uD558\uC138\uC694" }, void 0, !1, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 543,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV4("option", { value: "coffee", children: "\uCEE4\uD53C" }, void 0, !1, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 544,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV4("option", { value: "tea", children: "\uCC28" }, void 0, !1, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 545,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV4("option", { value: "juice", children: "\uC8FC\uC2A4" }, void 0, !1, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 546,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV4("option", { value: "smoothie", children: "\uC2A4\uBB34\uB514" }, void 0, !1, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 547,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV4("option", { value: "beverage", children: "\uC74C\uB8CC" }, void 0, !1, {
            fileName: "app/routes/admin.tsx",
            lineNumber: 548,
            columnNumber: 13
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/admin.tsx",
          lineNumber: 542,
          columnNumber: 11
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 538,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 522,
      columnNumber: 7
    }, this),
    menu && /* @__PURE__ */ jsxDEV4("div", { children: /* @__PURE__ */ jsxDEV4("label", { className: "flex items-center", children: [
      /* @__PURE__ */ jsxDEV4(
        "input",
        {
          type: "checkbox",
          name: "is_available",
          value: "true",
          defaultChecked: menu.is_available,
          className: "mr-2"
        },
        void 0,
        !1,
        {
          fileName: "app/routes/admin.tsx",
          lineNumber: 556,
          columnNumber: 13
        },
        this
      ),
      /* @__PURE__ */ jsxDEV4("span", { className: "text-sm text-warm-brown-700", children: "\uD310\uB9E4 \uAC00\uB2A5" }, void 0, !1, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 563,
        columnNumber: 13
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 555,
      columnNumber: 11
    }, this) }, void 0, !1, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 554,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV4("button", { type: "submit", className: "btn-primary", children: menu ? "\uC218\uC815" : "\uCD94\uAC00" }, void 0, !1, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 568,
      columnNumber: 7
    }, this)
  ] }, void 0, !0, {
    fileName: "app/routes/admin.tsx",
    lineNumber: 496,
    columnNumber: 5
  }, this);
}
function MenuCard({
  menu,
  onEdit,
  onUpdate
}) {
  return /* @__PURE__ */ jsxDEV4("div", { className: "border border-ivory-200 rounded-lg p-4 bg-white", children: [
    /* @__PURE__ */ jsxDEV4("div", { className: "flex justify-between items-start mb-2", children: [
      /* @__PURE__ */ jsxDEV4("h4", { className: "font-semibold text-warm-brown-900", children: menu.name }, void 0, !1, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 587,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV4("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${menu.is_available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`, children: menu.is_available ? "\uD310\uB9E4\uC911" : "\uD488\uC808" }, void 0, !1, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 588,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 586,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV4("p", { className: "text-sm text-warm-brown-600 mb-2", children: menu.description }, void 0, !1, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 595,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV4("p", { className: "text-lg font-bold text-wine-red-600 mb-3", children: [
      "\u20A9",
      menu.price.toLocaleString()
    ] }, void 0, !0, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 596,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV4("div", { className: "flex space-x-2", children: /* @__PURE__ */ jsxDEV4("button", { onClick: onEdit, className: "btn-secondary flex-1", children: [
      /* @__PURE__ */ jsxDEV4(Edit, { className: "w-4 h-4 mr-1" }, void 0, !1, {
        fileName: "app/routes/admin.tsx",
        lineNumber: 602,
        columnNumber: 11
      }, this),
      "\uC218\uC815"
    ] }, void 0, !0, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 601,
      columnNumber: 9
    }, this) }, void 0, !1, {
      fileName: "app/routes/admin.tsx",
      lineNumber: 600,
      columnNumber: 7
    }, this)
  ] }, void 0, !0, {
    fileName: "app/routes/admin.tsx",
    lineNumber: 585,
    columnNumber: 5
  }, this);
}

// app/routes/login.tsx
var login_exports = {};
__export(login_exports, {
  action: () => action2,
  default: () => LoginPage,
  loader: () => loader2
});
import { json as json2, redirect } from "@remix-run/node";
import { Form as Form2, useActionData as useActionData2, Link as Link2 } from "@remix-run/react";
import { useState as useState2 } from "react";
import { Mail, Lock, Eye, EyeOff, Coffee as Coffee3 } from "lucide-react";
import { supabase as supabase2 } from "~/lib/supabase.server";
import { jsxDEV as jsxDEV5 } from "react/jsx-dev-runtime";
async function loader2({ request }) {
  let returnTo = new URL(request.url).searchParams.get("returnTo") || "/";
  return json2({ returnTo });
}
async function action2({ request }) {
  let formData = await request.formData(), email = formData.get("email"), password = formData.get("password"), returnTo = formData.get("returnTo");
  if (!email || !password)
    return json2({ error: "\uC774\uBA54\uC77C\uACFC \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694." }, { status: 400 });
  try {
    let { data, error } = await supabase2.auth.signInWithPassword({
      email,
      password
    });
    return error ? json2({ error: "\uB85C\uADF8\uC778\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uC774\uBA54\uC77C\uACFC \uBE44\uBC00\uBC88\uD638\uB97C \uD655\uC778\uD574\uC8FC\uC138\uC694." }, { status: 400 }) : redirect(returnTo || "/admin");
  } catch (error) {
    return console.error("\uB85C\uADF8\uC778 \uC624\uB958:", error), json2({ error: "\uB85C\uADF8\uC778 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." }, { status: 500 });
  }
}
function LoginPage() {
  let actionData = useActionData2(), [showPassword, setShowPassword] = useState2(!1);
  return /* @__PURE__ */ jsxDEV5("div", { className: "min-h-screen bg-gradient-to-br from-ivory-50 to-warm-brown-50 flex items-center justify-center p-4", children: /* @__PURE__ */ jsxDEV5("div", { className: "max-w-md w-full", children: [
    /* @__PURE__ */ jsxDEV5("div", { className: "text-center mb-8", children: [
      /* @__PURE__ */ jsxDEV5("div", { className: "w-16 h-16 bg-wine-red-600 rounded-lg flex items-center justify-center mx-auto mb-4", children: /* @__PURE__ */ jsxDEV5(Coffee3, { className: "w-8 h-8 text-white" }, void 0, !1, {
        fileName: "app/routes/login.tsx",
        lineNumber: 57,
        columnNumber: 13
      }, this) }, void 0, !1, {
        fileName: "app/routes/login.tsx",
        lineNumber: 56,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV5("h1", { className: "text-2xl font-bold text-warm-brown-900 mb-2", children: "\uAD50\uD68C \uCE74\uD398 \uC8FC\uBB38 \uC2DC\uC2A4\uD15C" }, void 0, !1, {
        fileName: "app/routes/login.tsx",
        lineNumber: 59,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV5("p", { className: "text-warm-brown-600", children: "\uAD00\uB9AC\uC790 \uB85C\uADF8\uC778" }, void 0, !1, {
        fileName: "app/routes/login.tsx",
        lineNumber: 62,
        columnNumber: 11
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/login.tsx",
      lineNumber: 55,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV5("div", { className: "card", children: [
      /* @__PURE__ */ jsxDEV5(Form2, { method: "post", className: "space-y-6", children: [
        /* @__PURE__ */ jsxDEV5("input", { type: "hidden", name: "returnTo", value: "/admin" }, void 0, !1, {
          fileName: "app/routes/login.tsx",
          lineNumber: 70,
          columnNumber: 13
        }, this),
        actionData?.error && /* @__PURE__ */ jsxDEV5("div", { className: "text-red-600 text-sm bg-red-50 p-3 rounded-lg", children: actionData.error }, void 0, !1, {
          fileName: "app/routes/login.tsx",
          lineNumber: 73,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV5("div", { children: [
          /* @__PURE__ */ jsxDEV5("label", { className: "block text-sm font-medium text-warm-brown-700 mb-2", children: "\uC774\uBA54\uC77C" }, void 0, !1, {
            fileName: "app/routes/login.tsx",
            lineNumber: 79,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV5("div", { className: "relative", children: [
            /* @__PURE__ */ jsxDEV5(Mail, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-warm-brown-400" }, void 0, !1, {
              fileName: "app/routes/login.tsx",
              lineNumber: 83,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV5(
              "input",
              {
                type: "email",
                name: "email",
                required: !0,
                className: "input-field pl-10",
                placeholder: "\uC774\uBA54\uC77C\uC744 \uC785\uB825\uD558\uC138\uC694"
              },
              void 0,
              !1,
              {
                fileName: "app/routes/login.tsx",
                lineNumber: 84,
                columnNumber: 17
              },
              this
            )
          ] }, void 0, !0, {
            fileName: "app/routes/login.tsx",
            lineNumber: 82,
            columnNumber: 15
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/login.tsx",
          lineNumber: 78,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV5("div", { children: [
          /* @__PURE__ */ jsxDEV5("label", { className: "block text-sm font-medium text-warm-brown-700 mb-2", children: "\uBE44\uBC00\uBC88\uD638" }, void 0, !1, {
            fileName: "app/routes/login.tsx",
            lineNumber: 95,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV5("div", { className: "relative", children: [
            /* @__PURE__ */ jsxDEV5(Lock, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-warm-brown-400" }, void 0, !1, {
              fileName: "app/routes/login.tsx",
              lineNumber: 99,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV5(
              "input",
              {
                type: showPassword ? "text" : "password",
                name: "password",
                required: !0,
                className: "input-field pl-10 pr-10",
                placeholder: "\uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD558\uC138\uC694"
              },
              void 0,
              !1,
              {
                fileName: "app/routes/login.tsx",
                lineNumber: 100,
                columnNumber: 17
              },
              this
            ),
            /* @__PURE__ */ jsxDEV5(
              "button",
              {
                type: "button",
                onClick: () => setShowPassword(!showPassword),
                className: "absolute right-3 top-1/2 transform -translate-y-1/2 text-warm-brown-400 hover:text-warm-brown-600",
                children: showPassword ? /* @__PURE__ */ jsxDEV5(EyeOff, { className: "w-5 h-5" }, void 0, !1, {
                  fileName: "app/routes/login.tsx",
                  lineNumber: 112,
                  columnNumber: 35
                }, this) : /* @__PURE__ */ jsxDEV5(Eye, { className: "w-5 h-5" }, void 0, !1, {
                  fileName: "app/routes/login.tsx",
                  lineNumber: 112,
                  columnNumber: 68
                }, this)
              },
              void 0,
              !1,
              {
                fileName: "app/routes/login.tsx",
                lineNumber: 107,
                columnNumber: 17
              },
              this
            )
          ] }, void 0, !0, {
            fileName: "app/routes/login.tsx",
            lineNumber: 98,
            columnNumber: 15
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/login.tsx",
          lineNumber: 94,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV5(
          "button",
          {
            type: "submit",
            className: "w-full btn-primary py-3",
            children: "\uB85C\uADF8\uC778"
          },
          void 0,
          !1,
          {
            fileName: "app/routes/login.tsx",
            lineNumber: 117,
            columnNumber: 13
          },
          this
        )
      ] }, void 0, !0, {
        fileName: "app/routes/login.tsx",
        lineNumber: 69,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV5("div", { className: "mt-6 text-center", children: /* @__PURE__ */ jsxDEV5("p", { className: "text-sm text-warm-brown-600", children: [
        "\uACC4\uC815\uC774 \uC5C6\uC73C\uC2E0\uAC00\uC694?",
        " ",
        /* @__PURE__ */ jsxDEV5(
          Link2,
          {
            to: "/register",
            className: "text-wine-red-600 hover:text-wine-red-700 font-medium",
            children: "\uD68C\uC6D0\uAC00\uC785"
          },
          void 0,
          !1,
          {
            fileName: "app/routes/login.tsx",
            lineNumber: 128,
            columnNumber: 15
          },
          this
        )
      ] }, void 0, !0, {
        fileName: "app/routes/login.tsx",
        lineNumber: 126,
        columnNumber: 13
      }, this) }, void 0, !1, {
        fileName: "app/routes/login.tsx",
        lineNumber: 125,
        columnNumber: 11
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/login.tsx",
      lineNumber: 68,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV5("div", { className: "mt-6 card bg-ivory-100 border-ivory-300", children: [
      /* @__PURE__ */ jsxDEV5("h3", { className: "text-sm font-medium text-warm-brown-900 mb-2", children: "\uB370\uBAA8 \uACC4\uC815 (\uAC1C\uBC1C\uC6A9)" }, void 0, !1, {
        fileName: "app/routes/login.tsx",
        lineNumber: 140,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV5("div", { className: "text-xs text-warm-brown-600 space-y-1", children: [
        /* @__PURE__ */ jsxDEV5("p", { children: "\uC774\uBA54\uC77C: admin@church-cafe.com" }, void 0, !1, {
          fileName: "app/routes/login.tsx",
          lineNumber: 144,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV5("p", { children: "\uBE44\uBC00\uBC88\uD638: admin123" }, void 0, !1, {
          fileName: "app/routes/login.tsx",
          lineNumber: 145,
          columnNumber: 13
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/login.tsx",
        lineNumber: 143,
        columnNumber: 11
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/login.tsx",
      lineNumber: 139,
      columnNumber: 9
    }, this)
  ] }, void 0, !0, {
    fileName: "app/routes/login.tsx",
    lineNumber: 53,
    columnNumber: 7
  }, this) }, void 0, !1, {
    fileName: "app/routes/login.tsx",
    lineNumber: 52,
    columnNumber: 5
  }, this);
}

// app/routes/order.tsx
var order_exports = {};
__export(order_exports, {
  action: () => action3,
  default: () => OrderPage,
  loader: () => loader3
});
import { json as json3 } from "@remix-run/node";
import { Form as Form3, useLoaderData as useLoaderData2, useActionData as useActionData3 } from "@remix-run/react";
import { useState as useState3 } from "react";
import { Plus as Plus2, Minus, ShoppingCart } from "lucide-react";
import { supabase as supabase3 } from "~/lib/supabase.server";
import { Fragment, jsxDEV as jsxDEV6 } from "react/jsx-dev-runtime";
async function loader3({ request }) {
  let { data: menus } = await supabase3.from("menus").select("*").eq("is_available", !0).order("category", { ascending: !0 });
  return json3({ menus: menus || [] });
}
async function action3({ request }) {
  let formData = await request.formData(), customerName = formData.get("customerName"), churchGroup = formData.get("churchGroup"), paymentMethod = formData.get("paymentMethod"), cartItems = JSON.parse(formData.get("cartItems")), totalAmount = parseFloat(formData.get("totalAmount"));
  if (!customerName || cartItems.length === 0)
    return json3({ error: "\uACE0\uAC1D\uBA85\uACFC \uC8FC\uBB38 \uD56D\uBAA9\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694." }, { status: 400 });
  try {
    let { data: order, error: orderError } = await supabase3.from("orders").insert({
      customer_name: customerName,
      church_group: churchGroup || null,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      status: "pending",
      payment_status: "pending"
    }).select().single();
    if (orderError)
      throw orderError;
    let orderItems = cartItems.map((item) => ({
      order_id: order.id,
      menu_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity
    })), { error: itemsError } = await supabase3.from("order_items").insert(orderItems);
    if (itemsError)
      throw itemsError;
    return json3({ success: !0, orderId: order.id });
  } catch (error) {
    return console.error("\uC8FC\uBB38 \uC0DD\uC131 \uC624\uB958:", error), json3({ error: "\uC8FC\uBB38 \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." }, { status: 500 });
  }
}
function OrderPage() {
  let { menus } = useLoaderData2(), actionData = useActionData3(), [cart, setCart] = useState3([]), [selectedCategory, setSelectedCategory] = useState3("all"), categories = ["all", ...new Set(menus.map((menu) => menu.category))], filteredMenus = selectedCategory === "all" ? menus : menus.filter((menu) => menu.category === selectedCategory), addToCart = (menu) => {
    setCart((prev) => prev.find((item) => item.id === menu.id) ? prev.map(
      (item) => item.id === menu.id ? { ...item, quantity: item.quantity + 1 } : item
    ) : [...prev, { ...menu, quantity: 1 }]);
  }, removeFromCart = (menuId) => {
    setCart((prev) => prev.filter((item) => item.id !== menuId));
  }, updateQuantity = (menuId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(menuId);
      return;
    }
    setCart((prev) => prev.map(
      (item) => item.id === menuId ? { ...item, quantity } : item
    ));
  }, totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return actionData?.success ? /* @__PURE__ */ jsxDEV6("div", { className: "min-h-screen bg-ivory-50 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV6("div", { className: "card max-w-md w-full text-center", children: [
    /* @__PURE__ */ jsxDEV6("div", { className: "w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4", children: /* @__PURE__ */ jsxDEV6(ShoppingCart, { className: "w-8 h-8 text-green-600" }, void 0, !1, {
      fileName: "app/routes/order.tsx",
      lineNumber: 128,
      columnNumber: 13
    }, this) }, void 0, !1, {
      fileName: "app/routes/order.tsx",
      lineNumber: 127,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ jsxDEV6("h2", { className: "text-2xl font-semibold text-warm-brown-900 mb-2", children: "\uC8FC\uBB38\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4!" }, void 0, !1, {
      fileName: "app/routes/order.tsx",
      lineNumber: 130,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ jsxDEV6("p", { className: "text-warm-brown-600 mb-6", children: [
      "\uC8FC\uBB38\uBC88\uD638: ",
      actionData.orderId
    ] }, void 0, !0, {
      fileName: "app/routes/order.tsx",
      lineNumber: 133,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ jsxDEV6("a", { href: "/order", className: "btn-primary", children: "\uC0C8 \uC8FC\uBB38\uD558\uAE30" }, void 0, !1, {
      fileName: "app/routes/order.tsx",
      lineNumber: 136,
      columnNumber: 11
    }, this)
  ] }, void 0, !0, {
    fileName: "app/routes/order.tsx",
    lineNumber: 126,
    columnNumber: 9
  }, this) }, void 0, !1, {
    fileName: "app/routes/order.tsx",
    lineNumber: 125,
    columnNumber: 7
  }, this) : /* @__PURE__ */ jsxDEV6("div", { className: "min-h-screen bg-ivory-50", children: [
    /* @__PURE__ */ jsxDEV6("header", { className: "bg-white shadow-sm border-b border-ivory-200", children: /* @__PURE__ */ jsxDEV6("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxDEV6("div", { className: "flex justify-between items-center h-16", children: [
      /* @__PURE__ */ jsxDEV6("h1", { className: "text-xl font-semibold text-warm-brown-900", children: "\uC74C\uB8CC \uC8FC\uBB38" }, void 0, !1, {
        fileName: "app/routes/order.tsx",
        lineNumber: 150,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV6("div", { className: "flex items-center space-x-2", children: [
        /* @__PURE__ */ jsxDEV6(ShoppingCart, { className: "w-5 h-5 text-wine-red-600" }, void 0, !1, {
          fileName: "app/routes/order.tsx",
          lineNumber: 154,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV6("span", { className: "text-sm font-medium text-warm-brown-700", children: [
          cart.length,
          "\uAC1C \uD56D\uBAA9"
        ] }, void 0, !0, {
          fileName: "app/routes/order.tsx",
          lineNumber: 155,
          columnNumber: 15
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/order.tsx",
        lineNumber: 153,
        columnNumber: 13
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/order.tsx",
      lineNumber: 149,
      columnNumber: 11
    }, this) }, void 0, !1, {
      fileName: "app/routes/order.tsx",
      lineNumber: 148,
      columnNumber: 9
    }, this) }, void 0, !1, {
      fileName: "app/routes/order.tsx",
      lineNumber: 147,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV6("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: /* @__PURE__ */ jsxDEV6("div", { className: "grid lg:grid-cols-3 gap-8", children: [
      /* @__PURE__ */ jsxDEV6("div", { className: "lg:col-span-2", children: [
        /* @__PURE__ */ jsxDEV6("div", { className: "mb-6", children: /* @__PURE__ */ jsxDEV6("div", { className: "flex flex-wrap gap-2", children: categories.map((category) => /* @__PURE__ */ jsxDEV6(
          "button",
          {
            onClick: () => setSelectedCategory(category),
            className: `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === category ? "bg-wine-red-600 text-white" : "bg-ivory-200 text-warm-brown-700 hover:bg-ivory-300"}`,
            children: category === "all" ? "\uC804\uCCB4" : category
          },
          category,
          !1,
          {
            fileName: "app/routes/order.tsx",
            lineNumber: 171,
            columnNumber: 19
          },
          this
        )) }, void 0, !1, {
          fileName: "app/routes/order.tsx",
          lineNumber: 169,
          columnNumber: 15
        }, this) }, void 0, !1, {
          fileName: "app/routes/order.tsx",
          lineNumber: 168,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV6("div", { className: "grid md:grid-cols-2 gap-4", children: filteredMenus.map((menu) => /* @__PURE__ */ jsxDEV6("div", { className: "card hover:shadow-lg transition-shadow", children: /* @__PURE__ */ jsxDEV6("div", { className: "flex justify-between items-start mb-3", children: [
          /* @__PURE__ */ jsxDEV6("div", { children: [
            /* @__PURE__ */ jsxDEV6("h3", { className: "font-semibold text-warm-brown-900 mb-1", children: menu.name }, void 0, !1, {
              fileName: "app/routes/order.tsx",
              lineNumber: 192,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ jsxDEV6("p", { className: "text-sm text-warm-brown-600 mb-2", children: menu.description }, void 0, !1, {
              fileName: "app/routes/order.tsx",
              lineNumber: 195,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ jsxDEV6("p", { className: "text-lg font-bold text-wine-red-600", children: [
              "\u20A9",
              menu.price.toLocaleString()
            ] }, void 0, !0, {
              fileName: "app/routes/order.tsx",
              lineNumber: 198,
              columnNumber: 23
            }, this)
          ] }, void 0, !0, {
            fileName: "app/routes/order.tsx",
            lineNumber: 191,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV6(
            "button",
            {
              onClick: () => addToCart(menu),
              className: "w-8 h-8 bg-wine-red-600 text-white rounded-full flex items-center justify-center hover:bg-wine-red-700 transition-colors",
              children: /* @__PURE__ */ jsxDEV6(Plus2, { className: "w-4 h-4" }, void 0, !1, {
                fileName: "app/routes/order.tsx",
                lineNumber: 206,
                columnNumber: 23
              }, this)
            },
            void 0,
            !1,
            {
              fileName: "app/routes/order.tsx",
              lineNumber: 202,
              columnNumber: 21
            },
            this
          )
        ] }, void 0, !0, {
          fileName: "app/routes/order.tsx",
          lineNumber: 190,
          columnNumber: 19
        }, this) }, menu.id, !1, {
          fileName: "app/routes/order.tsx",
          lineNumber: 189,
          columnNumber: 17
        }, this)) }, void 0, !1, {
          fileName: "app/routes/order.tsx",
          lineNumber: 187,
          columnNumber: 13
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/order.tsx",
        lineNumber: 166,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV6("div", { className: "lg:col-span-1", children: /* @__PURE__ */ jsxDEV6("div", { className: "card sticky top-8", children: [
        /* @__PURE__ */ jsxDEV6("h2", { className: "text-lg font-semibold text-warm-brown-900 mb-4", children: "\uC8FC\uBB38 \uB0B4\uC5ED" }, void 0, !1, {
          fileName: "app/routes/order.tsx",
          lineNumber: 217,
          columnNumber: 15
        }, this),
        cart.length === 0 ? /* @__PURE__ */ jsxDEV6("p", { className: "text-warm-brown-500 text-center py-8", children: "\uC8FC\uBB38\uD560 \uC74C\uB8CC\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694" }, void 0, !1, {
          fileName: "app/routes/order.tsx",
          lineNumber: 222,
          columnNumber: 17
        }, this) : /* @__PURE__ */ jsxDEV6(Fragment, { children: [
          /* @__PURE__ */ jsxDEV6("div", { className: "space-y-3 mb-6", children: cart.map((item) => /* @__PURE__ */ jsxDEV6("div", { className: "flex items-center justify-between p-3 bg-ivory-50 rounded-lg", children: [
            /* @__PURE__ */ jsxDEV6("div", { className: "flex-1", children: [
              /* @__PURE__ */ jsxDEV6("h4", { className: "font-medium text-warm-brown-900", children: item.name }, void 0, !1, {
                fileName: "app/routes/order.tsx",
                lineNumber: 231,
                columnNumber: 27
              }, this),
              /* @__PURE__ */ jsxDEV6("p", { className: "text-sm text-warm-brown-600", children: [
                "\u20A9",
                item.price.toLocaleString(),
                " \xD7 ",
                item.quantity
              ] }, void 0, !0, {
                fileName: "app/routes/order.tsx",
                lineNumber: 234,
                columnNumber: 27
              }, this)
            ] }, void 0, !0, {
              fileName: "app/routes/order.tsx",
              lineNumber: 230,
              columnNumber: 25
            }, this),
            /* @__PURE__ */ jsxDEV6("div", { className: "flex items-center space-x-2", children: [
              /* @__PURE__ */ jsxDEV6(
                "button",
                {
                  onClick: () => updateQuantity(item.id, item.quantity - 1),
                  className: "w-6 h-6 bg-ivory-200 text-warm-brown-700 rounded flex items-center justify-center hover:bg-ivory-300",
                  children: /* @__PURE__ */ jsxDEV6(Minus, { className: "w-3 h-3" }, void 0, !1, {
                    fileName: "app/routes/order.tsx",
                    lineNumber: 243,
                    columnNumber: 29
                  }, this)
                },
                void 0,
                !1,
                {
                  fileName: "app/routes/order.tsx",
                  lineNumber: 239,
                  columnNumber: 27
                },
                this
              ),
              /* @__PURE__ */ jsxDEV6("span", { className: "w-8 text-center font-medium", children: item.quantity }, void 0, !1, {
                fileName: "app/routes/order.tsx",
                lineNumber: 245,
                columnNumber: 27
              }, this),
              /* @__PURE__ */ jsxDEV6(
                "button",
                {
                  onClick: () => updateQuantity(item.id, item.quantity + 1),
                  className: "w-6 h-6 bg-wine-red-600 text-white rounded flex items-center justify-center hover:bg-wine-red-700",
                  children: /* @__PURE__ */ jsxDEV6(Plus2, { className: "w-3 h-3" }, void 0, !1, {
                    fileName: "app/routes/order.tsx",
                    lineNumber: 252,
                    columnNumber: 29
                  }, this)
                },
                void 0,
                !1,
                {
                  fileName: "app/routes/order.tsx",
                  lineNumber: 248,
                  columnNumber: 27
                },
                this
              )
            ] }, void 0, !0, {
              fileName: "app/routes/order.tsx",
              lineNumber: 238,
              columnNumber: 25
            }, this)
          ] }, item.id, !0, {
            fileName: "app/routes/order.tsx",
            lineNumber: 229,
            columnNumber: 23
          }, this)) }, void 0, !1, {
            fileName: "app/routes/order.tsx",
            lineNumber: 227,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV6("div", { className: "border-t border-ivory-200 pt-4 mb-6", children: /* @__PURE__ */ jsxDEV6("div", { className: "flex justify-between items-center text-lg font-semibold", children: [
            /* @__PURE__ */ jsxDEV6("span", { children: "\uCD1D \uAE08\uC561" }, void 0, !1, {
              fileName: "app/routes/order.tsx",
              lineNumber: 261,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ jsxDEV6("span", { className: "text-wine-red-600", children: [
              "\u20A9",
              totalAmount.toLocaleString()
            ] }, void 0, !0, {
              fileName: "app/routes/order.tsx",
              lineNumber: 262,
              columnNumber: 23
            }, this)
          ] }, void 0, !0, {
            fileName: "app/routes/order.tsx",
            lineNumber: 260,
            columnNumber: 21
          }, this) }, void 0, !1, {
            fileName: "app/routes/order.tsx",
            lineNumber: 259,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV6(Form3, { method: "post", children: [
            /* @__PURE__ */ jsxDEV6("input", { type: "hidden", name: "cartItems", value: JSON.stringify(cart) }, void 0, !1, {
              fileName: "app/routes/order.tsx",
              lineNumber: 270,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV6("input", { type: "hidden", name: "totalAmount", value: totalAmount }, void 0, !1, {
              fileName: "app/routes/order.tsx",
              lineNumber: 271,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV6("div", { className: "space-y-4", children: [
              /* @__PURE__ */ jsxDEV6("div", { children: [
                /* @__PURE__ */ jsxDEV6("label", { className: "block text-sm font-medium text-warm-brown-700 mb-2", children: "\uACE0\uAC1D\uBA85 *" }, void 0, !1, {
                  fileName: "app/routes/order.tsx",
                  lineNumber: 275,
                  columnNumber: 25
                }, this),
                /* @__PURE__ */ jsxDEV6(
                  "input",
                  {
                    type: "text",
                    name: "customerName",
                    required: !0,
                    className: "input-field",
                    placeholder: "\uACE0\uAC1D\uBA85\uC744 \uC785\uB825\uD558\uC138\uC694"
                  },
                  void 0,
                  !1,
                  {
                    fileName: "app/routes/order.tsx",
                    lineNumber: 278,
                    columnNumber: 25
                  },
                  this
                )
              ] }, void 0, !0, {
                fileName: "app/routes/order.tsx",
                lineNumber: 274,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ jsxDEV6("div", { children: [
                /* @__PURE__ */ jsxDEV6("label", { className: "block text-sm font-medium text-warm-brown-700 mb-2", children: "\uBAA9\uC7A5 (\uC120\uD0DD\uC0AC\uD56D)" }, void 0, !1, {
                  fileName: "app/routes/order.tsx",
                  lineNumber: 288,
                  columnNumber: 25
                }, this),
                /* @__PURE__ */ jsxDEV6(
                  "input",
                  {
                    type: "text",
                    name: "churchGroup",
                    className: "input-field",
                    placeholder: "\uBAA9\uC7A5\uBA85\uC744 \uC785\uB825\uD558\uC138\uC694"
                  },
                  void 0,
                  !1,
                  {
                    fileName: "app/routes/order.tsx",
                    lineNumber: 291,
                    columnNumber: 25
                  },
                  this
                )
              ] }, void 0, !0, {
                fileName: "app/routes/order.tsx",
                lineNumber: 287,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ jsxDEV6("div", { children: [
                /* @__PURE__ */ jsxDEV6("label", { className: "block text-sm font-medium text-warm-brown-700 mb-2", children: "\uACB0\uC81C \uBC29\uBC95 *" }, void 0, !1, {
                  fileName: "app/routes/order.tsx",
                  lineNumber: 300,
                  columnNumber: 25
                }, this),
                /* @__PURE__ */ jsxDEV6("select", { name: "paymentMethod", required: !0, className: "input-field", children: [
                  /* @__PURE__ */ jsxDEV6("option", { value: "", children: "\uACB0\uC81C \uBC29\uBC95\uC744 \uC120\uD0DD\uD558\uC138\uC694" }, void 0, !1, {
                    fileName: "app/routes/order.tsx",
                    lineNumber: 304,
                    columnNumber: 27
                  }, this),
                  /* @__PURE__ */ jsxDEV6("option", { value: "cash", children: "\uD604\uAE08" }, void 0, !1, {
                    fileName: "app/routes/order.tsx",
                    lineNumber: 305,
                    columnNumber: 27
                  }, this),
                  /* @__PURE__ */ jsxDEV6("option", { value: "transfer", children: "\uACC4\uC88C\uC774\uCCB4" }, void 0, !1, {
                    fileName: "app/routes/order.tsx",
                    lineNumber: 306,
                    columnNumber: 27
                  }, this)
                ] }, void 0, !0, {
                  fileName: "app/routes/order.tsx",
                  lineNumber: 303,
                  columnNumber: 25
                }, this)
              ] }, void 0, !0, {
                fileName: "app/routes/order.tsx",
                lineNumber: 299,
                columnNumber: 23
              }, this),
              actionData?.error && /* @__PURE__ */ jsxDEV6("div", { className: "text-red-600 text-sm bg-red-50 p-3 rounded-lg", children: actionData.error }, void 0, !1, {
                fileName: "app/routes/order.tsx",
                lineNumber: 311,
                columnNumber: 25
              }, this),
              /* @__PURE__ */ jsxDEV6(
                "button",
                {
                  type: "submit",
                  className: "w-full btn-primary py-3",
                  disabled: cart.length === 0,
                  children: "\uC8FC\uBB38 \uC644\uB8CC"
                },
                void 0,
                !1,
                {
                  fileName: "app/routes/order.tsx",
                  lineNumber: 316,
                  columnNumber: 23
                },
                this
              )
            ] }, void 0, !0, {
              fileName: "app/routes/order.tsx",
              lineNumber: 273,
              columnNumber: 21
            }, this)
          ] }, void 0, !0, {
            fileName: "app/routes/order.tsx",
            lineNumber: 269,
            columnNumber: 19
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/order.tsx",
          lineNumber: 226,
          columnNumber: 17
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/order.tsx",
        lineNumber: 216,
        columnNumber: 13
      }, this) }, void 0, !1, {
        fileName: "app/routes/order.tsx",
        lineNumber: 215,
        columnNumber: 11
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/order.tsx",
      lineNumber: 164,
      columnNumber: 9
    }, this) }, void 0, !1, {
      fileName: "app/routes/order.tsx",
      lineNumber: 163,
      columnNumber: 7
    }, this)
  ] }, void 0, !0, {
    fileName: "app/routes/order.tsx",
    lineNumber: 145,
    columnNumber: 5
  }, this);
}

// server-assets-manifest:@remix-run/dev/assets-manifest
var assets_manifest_default = { entry: { module: "/build/entry.client-LLGUUMC4.js", imports: ["/build/_shared/chunk-O4BRYNJ4.js", "/build/_shared/chunk-QUWGJE46.js", "/build/_shared/chunk-EOTLWUVH.js", "/build/_shared/chunk-UWV35TSL.js", "/build/_shared/chunk-U4FRFQSK.js", "/build/_shared/chunk-XGOTYLZ5.js", "/build/_shared/chunk-7M6SC7J5.js", "/build/_shared/chunk-PNG5AS42.js"] }, routes: { root: { id: "root", parentId: void 0, path: "", index: void 0, caseSensitive: void 0, module: "/build/root-P2EIQFFR.js", imports: void 0, hasAction: !1, hasLoader: !1, hasClientAction: !1, hasClientLoader: !1, hasErrorBoundary: !1 }, "routes/_index": { id: "routes/_index", parentId: "root", path: void 0, index: !0, caseSensitive: void 0, module: "/build/routes/_index-AQ3JZ4LK.js", imports: ["/build/_shared/chunk-JEVRW7VH.js"], hasAction: !1, hasLoader: !1, hasClientAction: !1, hasClientLoader: !1, hasErrorBoundary: !1 }, "routes/admin": { id: "routes/admin", parentId: "root", path: "admin", index: void 0, caseSensitive: void 0, module: "/build/routes/admin-W33CBTNN.js", imports: ["/build/_shared/chunk-JNABDDE3.js", "/build/_shared/chunk-JEVRW7VH.js"], hasAction: !0, hasLoader: !0, hasClientAction: !1, hasClientLoader: !1, hasErrorBoundary: !1 }, "routes/login": { id: "routes/login", parentId: "root", path: "login", index: void 0, caseSensitive: void 0, module: "/build/routes/login-FOCYI7KI.js", imports: ["/build/_shared/chunk-JNABDDE3.js", "/build/_shared/chunk-JEVRW7VH.js"], hasAction: !0, hasLoader: !0, hasClientAction: !1, hasClientLoader: !1, hasErrorBoundary: !1 }, "routes/order": { id: "routes/order", parentId: "root", path: "order", index: void 0, caseSensitive: void 0, module: "/build/routes/order-CBPBCTDJ.js", imports: ["/build/_shared/chunk-JNABDDE3.js", "/build/_shared/chunk-JEVRW7VH.js"], hasAction: !0, hasLoader: !0, hasClientAction: !1, hasClientLoader: !1, hasErrorBoundary: !1 } }, version: "c696ab32", hmr: { runtime: "/build/_shared/chunk-EOTLWUVH.js", timestamp: 1751671036115 }, url: "/build/manifest-C696AB32.js" };

// server-entry-module:@remix-run/dev/server-build
var mode = "development", assetsBuildDirectory = "public/build", future = { v3_fetcherPersist: !1, v3_relativeSplatPath: !1, v3_throwAbortReason: !1, v3_routeConfig: !1, v3_singleFetch: !1, v3_lazyRouteDiscovery: !1, unstable_optimizeDeps: !1 }, publicPath = "/build/", entry = { module: entry_server_node_exports }, routes = {
  root: {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: root_exports
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: !0,
    caseSensitive: void 0,
    module: index_exports
  },
  "routes/admin": {
    id: "routes/admin",
    parentId: "root",
    path: "admin",
    index: void 0,
    caseSensitive: void 0,
    module: admin_exports
  },
  "routes/login": {
    id: "routes/login",
    parentId: "root",
    path: "login",
    index: void 0,
    caseSensitive: void 0,
    module: login_exports
  },
  "routes/order": {
    id: "routes/order",
    parentId: "root",
    path: "order",
    index: void 0,
    caseSensitive: void 0,
    module: order_exports
  }
};
export {
  assets_manifest_default as assets,
  assetsBuildDirectory,
  entry,
  future,
  mode,
  publicPath,
  routes
};
//# sourceMappingURL=index.js.map
