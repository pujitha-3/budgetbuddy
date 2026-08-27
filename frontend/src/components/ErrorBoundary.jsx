import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Something went wrong" };
  }
  componentDidCatch(error) {
    console.error("BudgetBuddy UI error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:30,fontFamily:"Poppins,Arial"}}>
          <div style={{maxWidth:520,textAlign:"center",background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,padding:30,boxShadow:"0 10px 30px rgba(0,0,0,.06)"}}>
            <h2 style={{marginTop:0}}>Something went wrong</h2>
            <p style={{color:"#667085"}}>The page could not be displayed. Please try again.</p>
            <button onClick={() => window.location.reload()} style={{border:0,borderRadius:10,padding:"11px 18px",background:"#4f46e5",color:"#fff",cursor:"pointer"}}>Reload page</button>
            <details style={{marginTop:18,textAlign:"left"}}><summary>Technical details</summary><pre style={{whiteSpace:"pre-wrap"}}>{this.state.message}</pre></details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
