import { useEffect, useMemo, useState } from "react";
import { FaBell, FaCheck, FaTrash, FaInfoCircle, FaExclamationTriangle, FaBullseye, FaCheckCircle, FaCrown, FaUserCog } from "react-icons/fa";
import Layout from "../components/Layout";
import { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification, clearNotifications } from "../services/notificationService";
import { useNavigate } from "react-router-dom";

export default function Notifications(){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const nav=useNavigate();

  const load=async()=>{ setLoading(true); setItems(await getNotifications()); setLoading(false); };
  useEffect(()=>{ load(); const refresh=()=>load(); window.addEventListener("budgetbuddy:notifications",refresh); const timer=setInterval(load,10000); return()=>{window.removeEventListener("budgetbuddy:notifications",refresh);clearInterval(timer)}; },[]);
  const unread=useMemo(()=>items.filter(x=>!x.read).length,[items]);

  const markAll=async()=>{await markAllNotificationsRead();await load();};
  const markOne=async(id)=>{await markNotificationRead(id);await load();};
  const remove=async(id)=>{await deleteNotification(id);await load();};
  const clear=async()=>{await clearNotifications();await load();};
  const Icon=({type})=>type==="warning"?<FaExclamationTriangle/>:type==="goal"?<FaBullseye/>:type==="success"?<FaCheckCircle/>:type==="premium_request"?<FaCrown/>:<FaInfoCircle/>;

  return <Layout><div className="extra-page">
    <div className="extra-head"><div><span className="eyebrow">STAY INFORMED</span><h1>Notifications</h1><p>Helpful reminders and updates about your financial activity.</p></div><div className="notification-actions">{unread>0&&<button className="secondary-btn" onClick={markAll}><FaCheck/> Mark all read</button>}{items.length>0&&<button className="ghost-btn" onClick={clear}><FaTrash/> Clear all</button>}</div></div>
    <div className="notification-list">
      {loading?<div className="extra-card empty-state"><FaBell/><h2>Loading notifications...</h2></div>:items.length===0?<div className="extra-card empty-state"><FaBell/><h2>You're all caught up</h2><p>No notifications right now.</p></div>:
      items.map(n=><div className={`notification extra-card ${n.read?"read":""}`} key={n.id}>
        <div className={`notification-icon ${n.type}`}><Icon type={n.type}/></div>
        <div className="notification-body"><div className="notification-title"><h3>{n.title}</h3>{!n.read&&<span className="new-dot">NEW</span>}</div><p>{n.text}</p><small>{(() => {const d=new Date(n.time);return Number.isNaN(d.getTime())?n.time:d.toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})})()}</small></div>
        <div className="notification-buttons">{n.action_path&&<button onClick={()=>nav(n.action_path)} title="Open"><FaUserCog/></button>}{!n.read&&<button onClick={()=>markOne(n.id)} title="Mark read"><FaCheck/></button>}<button onClick={()=>remove(n.id)} title="Delete"><FaTrash/></button></div>
      </div>)}
    </div>
  </div></Layout>
}
