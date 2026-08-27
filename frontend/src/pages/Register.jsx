import {useState} from "react";
import {Link,useNavigate} from "react-router-dom";
import {FaWallet,FaUser,FaEnvelope,FaLock,FaEye,FaEyeSlash} from "react-icons/fa";
import toast from "react-hot-toast";
import api from "../services/api";
import {addNotification} from "../services/notificationService";

const strong=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

export default function Register(){
 const nav=useNavigate();
 const [f,setF]=useState({name:"",email:"",password:"",confirm:""});
 const [show,setShow]=useState(false);
 const submit=async e=>{
  e.preventDefault();
  if(!f.name.trim()||!f.email.trim()||!f.password||!f.confirm) return toast.error("Fill all fields");
  if(!strong.test(f.password)) return toast.error("Use 8+ chars with uppercase, lowercase, number and special character");
  if(f.password!==f.confirm) return toast.error("Passwords do not match");
  try{
   await api.post("/auth/register",{name:f.name.trim(),email:f.email.trim(),password:f.password});
   addNotification({type:"success",title:"Registration successful",text:"Your BudgetBuddy account was created."});
   toast.success("Account created successfully");
   nav("/");
  }catch(e){toast.error(e.response?.data?.detail||"Registration failed");}
 };
 return <div className="auth-page"><section className="auth-hero"><div><div className="hero-brand"><FaWallet/>BudgetBuddy</div><h1>Build better money habits.</h1><p>Track income, expenses, budgets and savings in one simple financial workspace.</p></div></section><section className="auth-panel"><form className="auth-card" onSubmit={submit}><div className="eyebrow">GET STARTED</div><h2>Create your account</h2><p className="muted">Create your BudgetBuddy account to start managing your finances.</p><label>Full name</label><div className="field"><FaUser/><input value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Full name"/></div><label>Email</label><div className="field"><FaEnvelope/><input type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="you@example.com"/></div><label>Password</label><div className="field"><FaLock/><input type={show?"text":"password"} value={f.password} onChange={e=>setF({...f,password:e.target.value})} placeholder="Strong password"/><button type="button" className="icon-btn" onClick={()=>setShow(!show)}>{show?<FaEyeSlash/>:<FaEye/>}</button></div><label>Confirm password</label><div className="field"><FaLock/><input type={show?"text":"password"} value={f.confirm} onChange={e=>setF({...f,confirm:e.target.value})} placeholder="Repeat password"/></div><button className="primary-btn">Create account</button><p className="center muted">Already registered? <Link to="/">Sign in</Link></p></form></section></div>
}
