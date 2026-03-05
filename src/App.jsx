import { useState, useEffect, useRef, useCallback } from "react";

const WMO={0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Foggy",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Moderate rain",65:"Heavy rain",71:"Light snow",73:"Moderate snow",75:"Heavy snow",77:"Snow grains",80:"Showers",81:"Moderate showers",82:"Violent showers",85:"Light snow showers",86:"Heavy snow showers",95:"Thunderstorm",96:"Thunderstorm + hail",99:"Thunderstorm + heavy hail"};
const ICON={0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",51:"🌦️",53:"🌦️",55:"🌧️",61:"🌧️",63:"🌧️",65:"🌧️",71:"🌨️",73:"❄️",75:"❄️",77:"❄️",80:"🌦️",81:"🌧️",82:"⛈️",85:"🌨️",86:"❄️",95:"⛈️",96:"⛈️",99:"⛈️"};
const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function degToCompass(d){return["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.round(d/22.5)%16];}
function getAQI(v){if(v==null)return{label:"N/A",color:"#888",pct:0};if(v<=20)return{label:"Good",color:"#4fffa0",pct:Math.round(v/20*15)};if(v<=40)return{label:"Fair",color:"#a8ff4f",pct:Math.round(15+(v-20)/20*15)};if(v<=60)return{label:"Moderate",color:"#ffd94f",pct:Math.round(30+(v-40)/20*15)};if(v<=80)return{label:"Poor",color:"#ff9f4f",pct:Math.round(45+(v-60)/20*15)};if(v<=100)return{label:"Very Poor",color:"#ff5f7e",pct:Math.round(60+(v-80)/20*20)};return{label:"Hazardous",color:"#c026d3",pct:100};}

export default function App(){
  const[dark,setDark]=useState(true);
  const[query,setQuery]=useState("Bhubaneswar, Odisha");
  const[suggestions,setSuggestions]=useState([]);
  const[showSug,setShowSug]=useState(false);
  const[weather,setWeather]=useState(null);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");
  const deb=useRef(null);

  const th=dark?{bg:"#0a0e1a",card:"rgba(255,255,255,0.05)",border:"rgba(255,255,255,0.09)",text:"#f0f4ff",text2:"rgba(240,244,255,0.55)",text3:"rgba(240,244,255,0.32)",accent:"#4f9eff",shadow:"0 8px 40px rgba(0,0,0,0.5)",inputBg:"rgba(255,255,255,0.05)",sugBg:"#111827"}:{bg:"#e8f0fe",card:"rgba(255,255,255,0.82)",border:"rgba(37,99,235,0.15)",text:"#0d1b3e",text2:"rgba(13,27,62,0.6)",text3:"rgba(13,27,62,0.35)",accent:"#2563eb",shadow:"0 8px 40px rgba(37,99,235,0.1)",inputBg:"rgba(255,255,255,0.8)",sugBg:"#f0f6ff"};

  useEffect(()=>{
    if(deb.current)clearTimeout(deb.current);
    if(query.length<2){setSuggestions([]);setShowSug(false);return;}
    deb.current=setTimeout(async()=>{try{const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);const d=await r.json();setSuggestions(d.results||[]);setShowSug(!!(d.results?.length));}catch{setSuggestions([]);}},300);
  },[query]);

  const fetchWeather=useCallback(async(lat,lon,city,country,state)=>{
    setLoading(true);setError("");setShowSug(false);
    try{
      const[wRes,aqRes]=await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,uv_index,dew_point_2m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max&timezone=auto&forecast_days=7&wind_speed_unit=kmh`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi&timezone=auto`)
      ]);
      const w=await wRes.json();const aq=await aqRes.json().catch(()=>null);
      setWeather({...w,city,country,state,aqi:aq?.current?.european_aqi??aq?.current?.us_aqi??null});
    }catch{setError("Failed to load weather. Check connection.");}
    setLoading(false);
  },[]);

  useEffect(()=>{fetchWeather( 20.2961,
    85.8245,
    "Bhubaneswar",
    "India",
    "Odisha");},[fetchWeather]);

  const handleSearch=async()=>{if(!query.trim())return;setLoading(true);setError("");try{const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);const d=await r.json();if(!d.results?.length){setError("City not found.");setLoading(false);return;}const c=d.results[0];fetchWeather(c.latitude,c.longitude,c.name,c.country||"",c.admin1||"");}catch{setError("Network error.");setLoading(false);}};

  const handleLocation=()=>{if(!navigator.geolocation){setError("Geolocation not supported.");return;}setLoading(true);navigator.geolocation.getCurrentPosition(async(pos)=>{const{latitude:lat,longitude:lon}=pos.coords;try{const nr=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);const nd=await nr.json();fetchWeather(lat,lon,nd.address?.city||nd.address?.town||"My Location",nd.address?.country||"",nd.address?.state||"");}catch{fetchWeather(lat,lon,"My Location","","");}},()=>{setError("Location access denied.");setLoading(false);});};

  const now=new Date();const w=weather;
  let hourly=[];
  if(w){let si=w.hourly.time.findIndex(t=>new Date(t).getHours()===now.getHours()&&new Date(t).toDateString()===now.toDateString());if(si<0)si=0;for(let i=si;i<Math.min(si+24,w.hourly.time.length);i++)hourly.push({time:new Date(w.hourly.time[i]),temp:w.hourly.temperature_2m[i],code:w.hourly.weather_code[i],rain:w.hourly.precipitation_probability?.[i]??0,isNow:i===si});}

  const CS={background:th.card,border:`1.5px solid ${th.border}`,borderRadius:22,padding:"24px",boxShadow:th.shadow,marginBottom:16,position:"relative",overflow:"hidden",transition:"all 0.3s"};
  const accent=<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#4f9eff,#a855f7,#22d3ee)"}}/>;

  return(
    <div style={{fontFamily:"system-ui,sans-serif",background:th.bg,minHeight:"100vh",color:th.text,transition:"background 0.35s,color 0.35s",padding:"24px 16px 60px"}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{height:4px;width:4px}::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.3);border-radius:9px}.hov:hover{transform:translateY(-3px)!important}.hovx:hover{transform:translateX(4px)!important}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}.fi{animation:fi 0.4s ease forwards}`}</style>
      <div style={{maxWidth:900,margin:"0 auto"}}>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28}}>
          <div
            style={{
              fontSize: "1.35rem",
              fontWeight: 800,
              letterSpacing: "-0.01em",
              color: th.accent,
              transition: "color 0.3s ease"
            }}
          >
            ⛅ Atmosfy
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:"0.75rem",color:th.text3}}>{dark?"🌙 Dark":"☀️ Light"}</span>
            <button onClick={()=>setDark(d=>!d)} title="Toggle theme" style={{width:52,height:28,background:th.card,border:`1.5px solid ${th.border}`,borderRadius:999,cursor:"pointer",position:"relative",outline:"none",transition:"all 0.3s"}}>
              <div style={{position:"absolute",top:3,left:dark?26:3,width:20,height:20,borderRadius:"50%",background:dark?"linear-gradient(135deg,#4f9eff,#7cc4ff)":"linear-gradient(135deg,#fbbf24,#f59e0b)",transition:"left 0.3s",boxShadow:"0 2px 8px rgba(0,0,0,0.25)"}}/>
            </button>
          </div>
        </div>

        <div style={{position:"relative",marginBottom:12}}>
          <div style={{display:"flex",gap:10,marginBottom:10}}>
            <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()} onFocus={()=>suggestions.length&&setShowSug(true)}
              placeholder="Search city, country…"
              style={{flex:1,padding:"13px 18px",background:th.inputBg,border:`1.5px solid ${th.border}`,borderRadius:14,color:th.text,fontSize:"1rem",outline:"none"}}/>
            <button onClick={handleSearch} style={{padding:"0 22px",background:`linear-gradient(135deg,${th.accent},#7c3aed)`,border:"none",borderRadius:14,color:"#fff",fontSize:"0.95rem",cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>Search</button>
          </div>
          {showSug&&<div style={{position:"absolute",top:"calc(100% - 4px)",left:0,right:0,background:th.sugBg,border:`1.5px solid ${th.border}`,borderRadius:14,zIndex:100,overflow:"hidden",boxShadow:th.shadow}}>
            {suggestions.map((s,i)=><div key={i} onClick={()=>{setQuery(`${s.name}${s.admin1?", "+s.admin1:""}${s.country?", "+s.country:""}`);setShowSug(false);fetchWeather(s.latitude,s.longitude,s.name,s.country||"",s.admin1||"");}}
              style={{padding:"12px 18px",cursor:"pointer",fontSize:"0.9rem",color:th.text2}}
              onMouseEnter={e=>e.currentTarget.style.background=dark?"rgba(255,255,255,0.07)":"rgba(37,99,235,0.07)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              📍 {s.name}{s.admin1?", "+s.admin1:""}{s.country?", "+s.country:""}
            </div>)}
          </div>}
        </div>

        <button onClick={handleLocation} style={{display:"flex",alignItems:"center",gap:8,background:th.card,border:`1.5px solid ${th.border}`,borderRadius:12,padding:"10px 16px",color:th.text2,fontSize:"0.85rem",cursor:"pointer",fontFamily:"inherit",marginBottom:20}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=th.accent;e.currentTarget.style.color=th.accent;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=th.border;e.currentTarget.style.color=th.text2;}}>
          📍 Use my current location
        </button>

        {error&&<div style={{background:"rgba(255,95,126,0.1)",border:"1.5px solid rgba(255,95,126,0.3)",borderRadius:14,padding:"14px 18px",color:"#ff5f7e",marginBottom:16,textAlign:"center"}}>⚠️ {error}</div>}

        {loading&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:260,gap:16}}>
          <div style={{width:44,height:44,border:`3px solid ${th.border}`,borderTopColor:th.accent,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
          <div style={{color:th.text2,fontSize:"0.9rem"}}>Loading weather data…</div>
        </div>}

        {!loading&&w&&(()=>{
          const c=w.current,aqi=getAQI(w.aqi);
          const sr=new Date(w.daily.sunrise[0]),ss=new Date(w.daily.sunset[0]);
          const dayMins=(ss-sr)/60000,prog=Math.max(0,Math.min(1,(now-sr)/(ss-sr)));
          const ang=Math.PI*prog,sx=(10+100*prog).toFixed(1),sy=(50-55*Math.sin(ang)).toFixed(1);
          return(<>
            <div className="fi" style={CS}>{accent}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div>
                  <div style={{fontWeight:800,fontSize:"clamp(1.4rem,4vw,2rem)",letterSpacing:"-0.02em"}}>{w.city}</div>
                  <div style={{fontSize:"0.78rem",color:th.text3,marginTop:3}}>{[w.state,w.country].filter(Boolean).join(", ")}</div>
                </div>
                <div style={{textAlign:"right",color:th.text2,fontSize:"0.78rem",lineHeight:1.8}}>
                  {DAYS[now.getDay()]}, {now.getDate()} {MONTHS[now.getMonth()]}<br/>{now.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <div style={{fontSize:"clamp(3rem,8vw,5rem)",lineHeight:1}}>{ICON[c.weather_code]||"🌡️"}</div>
                <div>
                  <div style={{display:"flex",alignItems:"flex-start"}}>
                    <div style={{fontWeight:800,fontSize:"clamp(3.5rem,10vw,6rem)",lineHeight:1,letterSpacing:"-0.04em"}}>{Math.round(c.temperature_2m)}</div>
                    <div style={{fontSize:"1.8rem",color:th.text3,marginTop:8}}>°C</div>
                  </div>
                  <div style={{fontSize:"0.8rem",color:th.text2}}>Feels like {Math.round(c.apparent_temperature)}°C</div>
                </div>
                <div style={{marginLeft:"auto",textAlign:"right"}}>
                  <div style={{fontSize:"1rem",fontWeight:600,marginBottom:4}}>{WMO[c.weather_code]||"—"}</div>
                  <div style={{fontSize:"0.8rem",color:th.text2}}>H: {Math.round(w.daily.temperature_2m_max[0])}° · L: {Math.round(w.daily.temperature_2m_min[0])}°</div>
                </div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(152px,1fr))",gap:12,marginBottom:16}}>
              {[
                {icon:"💧",label:"Humidity",val:`${c.relative_humidity_2m}%`,sub:c.relative_humidity_2m<30?"Very dry":c.relative_humidity_2m<50?"Comfortable":c.relative_humidity_2m<70?"Moderate":"Very humid"},
                {icon:"💨",label:"Wind Speed",val:`${Math.round(c.wind_speed_10m)} km/h`,sub:degToCompass(c.wind_direction_10m)+" direction"},
                {icon:"🌫️",label:"AQI (EU)",val:w.aqi!=null?Math.round(w.aqi):"N/A",sub:aqi.label,isAqi:true,aqiColor:aqi.color,aqiPct:aqi.pct},
                {icon:"🌡️",label:"Pressure",val:`${Math.round(c.pressure_msl)} hPa`,sub:c.pressure_msl>1020?"High":c.pressure_msl>1000?"Normal":"Low"},
                {icon:"👁️",label:"Visibility",val:`${(c.visibility/1000).toFixed(1)} km`,sub:c.visibility>10000?"Excellent":c.visibility>5000?"Good":c.visibility>2000?"Moderate":"Poor"},
                {icon:"☁️",label:"Cloud Cover",val:`${c.cloud_cover}%`,sub:c.cloud_cover<25?"Clear":c.cloud_cover<50?"Few clouds":c.cloud_cover<75?"Broken":"Overcast"},
                {icon:"🌧️",label:"Precipitation",val:`${(c.precipitation||0).toFixed(1)} mm`,sub:"Current hour"},
                {icon:"☀️",label:"UV Index",val:c.uv_index??w.daily.uv_index_max?.[0]??0,sub:((v)=>v<3?"Low":v<6?"Moderate":v<8?"High":v<11?"Very High":"Extreme")(c.uv_index??0)},
              ].map((s,i)=>(
                <div key={i} className="hov fi" style={{background:th.card,border:`1.5px solid ${th.border}`,borderRadius:18,padding:"16px 13px",boxShadow:th.shadow,transition:"transform 0.2s",animationDelay:i*0.05+"s"}}>
                  <span style={{fontSize:"1.2rem",marginBottom:8,display:"block"}}>{s.icon}</span>
                  <div style={{fontSize:"0.65rem",color:th.text3,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>{s.label}</div>
                  <div style={{fontWeight:700,fontSize:"1.25rem",letterSpacing:"-0.02em",color:s.isAqi?s.aqiColor:th.text}}>{s.val}</div>
                  <div style={{fontSize:"0.7rem",color:th.text2,marginTop:2}}>{s.sub}</div>
                  {s.isAqi&&<div style={{marginTop:7,height:4,background:th.border,borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:s.aqiPct+"%",background:s.aqiColor,borderRadius:99,transition:"width 1s ease"}}/></div>}
                </div>
              ))}
            </div>

            <div style={{fontSize:"0.7rem",color:th.text3,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10,fontWeight:600}}>24-Hour Forecast</div>
            <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:8,marginBottom:16}}>
              {hourly.map((h,i)=>(
                <div key={i} className="hov" style={{minWidth:64,background:h.isNow?`rgba(79,158,255,0.14)`:th.card,border:`1.5px solid ${h.isNow?th.accent:th.border}`,borderRadius:14,padding:"11px 7px",textAlign:"center",flexShrink:0,transition:"transform 0.2s"}}>
                  <div style={{fontSize:"0.62rem",color:th.text3,marginBottom:7}}>{h.isNow?"Now":h.time.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
                  <div style={{fontSize:"1.2rem",marginBottom:7}}>{ICON[h.code]||"🌡️"}</div>
                  <div style={{fontWeight:700,fontSize:"0.9rem"}}>{Math.round(h.temp)}°</div>
                  <div style={{fontSize:"0.6rem",color:"#4f9eff",marginTop:4}}>{h.rain}%💧</div>
                </div>
              ))}
            </div>

            <div style={{fontSize:"0.7rem",color:th.text3,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10,fontWeight:600}}>7-Day Forecast</div>
            <div style={{marginBottom:16}}>
              {w.daily.time.map((_,i)=>{
                const d=new Date(w.daily.time[i]),hi=Math.round(w.daily.temperature_2m_max[i]),lo=Math.round(w.daily.temperature_2m_min[i]);
                const ghi=Math.max(...w.daily.temperature_2m_max),glo=Math.min(...w.daily.temperature_2m_min);
                const bl=((lo-glo)/(ghi-glo||1)*100).toFixed(1),bw=Math.max(8,((hi-lo)/(ghi-glo||1)*100)).toFixed(1);
                return <div key={i} className="hovx" style={{display:"flex",alignItems:"center",background:th.card,border:`1.5px solid ${th.border}`,borderRadius:14,padding:"12px 16px",gap:12,marginBottom:9,transition:"transform 0.2s"}}>
                  <div style={{fontWeight:500,minWidth:36,fontSize:"0.84rem"}}>{i===0?"Today":DAYS[d.getDay()]}</div>
                  <div style={{fontSize:"1.25rem"}}>{ICON[w.daily.weather_code[i]]||"🌡️"}</div>
                  <div style={{flex:1,color:th.text2,fontSize:"0.78rem"}}>{WMO[w.daily.weather_code[i]]||""}</div>
                  <div style={{fontSize:"0.71rem",color:"#4f9eff",minWidth:30,textAlign:"center"}}>{w.daily.precipitation_probability_max?.[i]??0}%</div>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:"0.78rem",color:th.text3}}>{lo}°</span>
                    <div style={{position:"relative",height:4,width:60,background:th.border,borderRadius:99}}>
                      <div style={{position:"absolute",left:bl+"%",width:bw+"%",height:"100%",background:"linear-gradient(90deg,#4f9eff,#ff9f4f)",borderRadius:99}}/>
                    </div>
                    <span style={{fontSize:"0.84rem",fontWeight:700}}>{hi}°</span>
                  </div>
                </div>;
              })}
            </div>

            <div style={CS}>{accent}
              <div style={{fontSize:"0.7rem",color:th.text3,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14,fontWeight:600}}>Sun & Atmosphere</div>
              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20}}>
                <div style={{textAlign:"center"}}><div style={{fontSize:"0.65rem",color:th.text3,textTransform:"uppercase",letterSpacing:"0.08em"}}>Sunrise</div><div style={{fontWeight:700,fontSize:"1.05rem",marginTop:4}}>{sr.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div></div>
                <div style={{flex:1,height:50}}>
                  <svg viewBox="0 0 120 60" fill="none" style={{width:"100%",height:"100%"}}>
                    <path d="M10 50 Q60 -10 110 50" stroke="rgba(251,191,36,0.18)" strokeWidth="2" fill="none"/>
                    <circle cx={sx} cy={sy} r="6" fill="#fbbf24" style={{filter:"drop-shadow(0 0 8px rgba(251,191,36,0.6))"}}/>
                  </svg>
                </div>
                <div style={{textAlign:"center"}}><div style={{fontSize:"0.65rem",color:th.text3,textTransform:"uppercase",letterSpacing:"0.08em"}}>Sunset</div><div style={{fontWeight:700,fontSize:"1.05rem",marginTop:4}}>{ss.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div></div>
              </div>
              <div style={{display:"flex",justifyContent:"space-around",flexWrap:"wrap",gap:14}}>
                {[["Day Length",`${Math.floor(dayMins/60)}h ${Math.round(dayMins%60)}m`],["Wind Gusts",`${Math.round(c.wind_gusts_10m)} km/h`],["Dew Point",`${Math.round(c.dew_point_2m)}°C`],["Wind Dir",degToCompass(c.wind_direction_10m)]].map(([l,v])=>(
                  <div key={l} style={{textAlign:"center"}}><div style={{fontSize:"0.65rem",color:th.text3,textTransform:"uppercase",letterSpacing:"0.08em"}}>{l}</div><div style={{fontWeight:700,fontSize:"0.94rem",marginTop:4}}>{v}</div></div>
                ))}
              </div>
            </div>
          </>);
        })()}

        {!loading&&!w&&!error&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:260,gap:14}}>
          <div style={{fontSize:"4rem"}}>🌍</div>
          <div style={{fontWeight:700,fontSize:"1.2rem"}}>Search any city</div>
          <div style={{color:th.text2,fontSize:"0.88rem"}}>or use your current location</div>
        </div>}
      </div>
    </div>
  );
}