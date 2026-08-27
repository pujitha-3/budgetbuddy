import {useEffect,useMemo,useState} from "react";
import {FaBell,FaCheck,FaTrash,FaInfoCircle,FaExclamationTriangle,FaBullseye,FaCheckCircle} from "react-icons/fa";
import Layout from "../components/Layout";

const KEY="budgetbuddy_notifications";

export default function Notifications(){
  const [items,setItems]=useState([]);

  useEffect(()=>{
    try{
      const stored=JSON.parse(localStorage.getItem(KEY)||"null");
      if(stored){setItems(stored);return}
    }catch{}
    const initial=[
      {id:1,type:"info",title:"Welcome to BudgetBuddy",text:"Your finance notifications will appear here.",time:"Just now",read:false},
      {id:2,type:"goal",title:"Set a savings goal",text:"Create a goal to start tracking your savings progress.",time:"Today",read:false}
    ];
    setItems(initial);
    localStorage.setItem(KEY,JSON.stringify(initial));
  },[]);

  useEffect(() => {
    const refresh = () => {
      try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setItems([]); }
    };
    const onStorage = (event) => { if (event.key === KEY) refresh(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("budgetbuddy:notifications", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("budgetbuddy:notifications", refresh);
    };
  },[]);

  const save=next=>{setItems(next);localStorage.setItem(KEY,JSON.stringify(next))};
  const unread=useMemo(()=>items.filter(x=>!x.read).length,[items]);

  const markAll=()=>save(items.map(x=>({...x,read:true})));
  const markOne=id=>save(items.map(x=>x.id===id?{...x,read:true}:x));
  const remove=id=>save(items.filter(x=>x.id!==id));
  const clear=()=>save([]);

  const Icon=({type})=>type==="warning"?<FaExclamationTriangle/>:type==="goal"?<FaBullseye/>:type==="success"?<FaCheckCircle/>:<FaInfoCircle/>;

  return <Layout><div className="extra-page">
    <div className="extra-head">
      <div>
        <span className="eyebrow">STAY INFORMED</span>
        <h1>Notifications</h1>
        <p>Helpful reminders and updates about your financial activity.</p>
      </div>
      <div className="notification-actions">
        {unread>0&&<button className="secondary-btn" onClick={markAll}><FaCheck/> Mark all read</button>}
        {items.length>0&&<button className="ghost-btn" onClick={clear}><FaTrash/> Clear all</button>}
      </div>
    </div>

    <div className="notification-list">
      {items.length===0?<div className="extra-card empty-state"><FaBell/><h2>You're all caught up</h2><p>No notifications right now.</p></div>:
      items.map(n=><div className={`notification extra-card ${n.read?"read":""}`} key={n.id}>
        <div className={`notification-icon ${n.type}`}><Icon type={n.type}/></div>
        <div className="notification-body"><div className="notification-title"><h3>{n.title}</h3>{!n.read&&<span className="new-dot">NEW</span>}</div><p>{n.text}</p><small>{(() => { const d = new Date(n.time); return Number.isNaN(d.getTime()) ? n.time : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); })()}</small></div>
        <div className="notification-buttons">{!n.read&&<button onClick={()=>markOne(n.id)} title="Mark read"><FaCheck/></button>}<button onClick={()=>remove(n.id)} title="Delete"><FaTrash/></button></div>
      </div>)}
    </div>
  </div></Layout>
}
