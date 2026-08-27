import React from "react";
import ReactDOM from "react-dom/client";
import {BrowserRouter} from "react-router-dom";
import {Toaster} from "react-hot-toast";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter><Toaster position="top-right"/><ErrorBoundary><App/></ErrorBoundary></BrowserRouter>
);
