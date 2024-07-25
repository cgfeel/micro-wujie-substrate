import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import SubPage from "./pages/SubPage";
import reportWebVitals from "./reportWebVitals";

// const root = ReactDOM.createRoot(
//   document.getElementById("root") as HTMLElement
// );
// issue: https://github.com/Tencent/wujie/issues/672
// root.render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// );
// root.render(<App />);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
const dom: { root: ReactDOM.Root | null } = {
  root: null,
};

function render({ sub, container = document }: CustomProps) {
  const wrap = container.querySelector("#root");
  if (wrap === null) return;

  dom.root = ReactDOM.createRoot(wrap);
  dom.root.render(sub ? <SubPage /> : <App />);

  // If you want to start measuring performance in your app, pass a function
  // to log results (for example: reportWebVitals(console.log))
  // or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
  reportWebVitals();
}

// render({})

if (window.__POWERED_BY_WUJIE__) {
  window.__WUJIE_MOUNT = () => render({ sub: true });
  window.__WUJIE_UNMOUNT = () => dom.root?.unmount();
} else {
  render({});
}

interface CustomProps {
  container?: HTMLDivElement | Document;
  sub?: boolean;
}
