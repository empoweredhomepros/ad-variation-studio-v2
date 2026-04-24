import { useState, useMemo, useRef, useCallback, useEffect } from "react";

const INITIAL_PREHOOKS = [
  { id:"PH1", descriptor:"AI avatar intro", text:"Hey, before you scroll — this is genuinely worth 30 seconds of your time.", tag:"AI", driveUrl:"", videoFileName:"" },
];
const INITIAL_HOOKS = [
  { id:"H1a", descriptor:"founder at desk", text:"Most founders waste money on ads because they skip this one step.", tag:"Founder", driveUrl:"", videoFileName:"" },
  { id:"H1b", descriptor:"founder walking",  text:"I spent $50K on ads before I figured out what I'm about to show you.", tag:"Founder", driveUrl:"", videoFileName:"" },
  { id:"H2a", descriptor:"kitchen setting",  text:"What if your next ad paid for itself in 48 hours?", tag:"UGC", driveUrl:"", videoFileName:"" },
  { id:"H2b", descriptor:"outdoor casual",   text:"Real talk — here's exactly what's been working for us this month.", tag:"UGC", driveUrl:"", videoFileName:"" },
  { id:"H3",  descriptor:"",                 text:"Stop scrolling. This 30 seconds could change how you run your ads forever.", tag:"AI", driveUrl:"", videoFileName:"" },
  { id:"H4",  descriptor:"narrated",         text:"Here's the one thing every high-converting ad has in common.", tag:"VO", driveUrl:"", videoFileName:"" },
];
const INITIAL_LEADS = [
  { id:"L1", descriptor:"", text:"The problem isn't your product. It's how you're leading with it.", tag:"Founder", driveUrl:"", videoFileName:"" },
  { id:"L2", descriptor:"", text:"I used to think more spend meant more results. Here's why that's backwards.", tag:"Founder", driveUrl:"", videoFileName:"" },
  { id:"L3", descriptor:"", text:"After testing over 200 creatives, the pattern is undeniable.", tag:"UGC", driveUrl:"", videoFileName:"" },
  { id:"L4", descriptor:"", text:"It comes down to one thing: the first 3 seconds.", tag:"AI", driveUrl:"", videoFileName:"" },
  { id:"L5", descriptor:"", text:"Every winning ad shares one structural secret.", tag:"VO", driveUrl:"", videoFileName:"" },
];
const INITIAL_BODIES = [
  { id:"B1", descriptor:"", text:"We restructured our hook-lead framework and saw a 3x improvement in hold rate within two weeks.", tag:"Any", driveUrl:"", videoFileName:"" },
  { id:"B2", descriptor:"", text:"The formula is simple: match the energy of your hook in the lead, then deliver one specific promise in the body.", tag:"Any", driveUrl:"", videoFileName:"" },
  { id:"B3", descriptor:"", text:"Most creatives fail because they try to say everything. Pick one problem, one person, one outcome.", tag:"Any", driveUrl:"", videoFileName:"" },
];
const INITIAL_CTAS = [
  { id:"CTA1", descriptor:"direct link",  text:"Click below to get the free framework.", tag:"Any", driveUrl:"", videoFileName:"" },
  { id:"CTA2", descriptor:"DM prompt",    text:"DM us 'ADS' and we'll send it over.", tag:"UGC", driveUrl:"", videoFileName:"" },
  { id:"CTA3", descriptor:"founder ask",  text:"Book a free call with me — link is right below.", tag:"Founder", driveUrl:"", videoFileName:"" },
];
const INITIAL_TRANSITIONS = [];

const TAG_COLORS = {
  Founder: { bg:"bg-amber-500/20",   text:"text-amber-400",   border:"border-amber-500/30"  },
  UGC:     { bg:"bg-emerald-500/20", text:"text-emerald-400", border:"border-emerald-500/30" },
  AI:      { bg:"bg-sky-500/20",     text:"text-sky-400",     border:"border-sky-500/30"    },
  VO:      { bg:"bg-violet-500/20",  text:"text-violet-400",  border:"border-violet-500/30" },
  Any:     { bg:"bg-zinc-700/40",    text:"text-zinc-400",    border:"border-zinc-600/30"   },
};
const ALL_TAGS   = ["All","Founder","UGC","AI","VO","Any"];
const ASSET_TAGS = ["Founder","UGC","AI","VO","Any"];

const fmtDate = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${String(d.getFullYear()).slice(-2)}`;
};

function Tag({ tag }) {
  const c = TAG_COLORS[tag] || TAG_COLORS["Any"];
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${c.bg} ${c.text} ${c.border}`}>{tag}</span>;
}
// Multi-select tag filter — "All" clears others; clicking an active tag deselects it
// tagSet is a Set<string>; "All" means empty set (show everything)
function TagFilterRow({ tagSet, onChange }) {
  const allActive = tagSet.size === 0;
  const toggle = t => {
    if (t === "All") { onChange(new Set()); return; }
    const next = new Set(tagSet);
    next.has(t) ? next.delete(t) : next.add(t);
    onChange(next);
  };
  return (
    <div className="flex gap-1 flex-wrap">
      <button onClick={()=>toggle("All")}
        className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${allActive?"bg-amber-500 text-black":"bg-zinc-800 text-zinc-400 hover:text-white"}`}>
        All
      </button>
      {ALL_TAGS.filter(t=>t!=="All").map(t=>{
        const active=tagSet.has(t);
        return (
          <button key={t} onClick={()=>toggle(t)}
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${active?"bg-amber-500 text-black":"bg-zinc-800 text-zinc-400 hover:text-white"}`}>
            {t}
          </button>
        );
      })}
    </div>
  );
}
// Helper: does item.tag pass the multi-select filter?
function tagMatch(itemTag, tagSet) {
  return tagSet.size === 0 || tagSet.has(itemTag);
}

function FilterBar({ tagSet, setTagSet, search, setSearch, placeholder }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={placeholder||"Search..."}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 w-44"/>
      <TagFilterRow tagSet={tagSet} onChange={setTagSet}/>
    </div>
  );
}

function ProgressRing({ done, total, combos, validationStore, locked }) {
  const [ringTagSet, setRingTagSet] = useState(new Set());
  // Compute filtered done/total based on selected tags
  const { filteredDone, filteredTotal } = useMemo(() => {
    if (ringTagSet.size === 0) return { filteredDone: done, filteredTotal: total };
    // AND logic: both hook AND lead must match the selected tags
    const relevant = combos.filter(c => tagMatch(c.hookTag, ringTagSet) && tagMatch(c.leadTag, ringTagSet));
    // If locked, only count valid combos
    const pool = locked && Object.keys(validationStore).length > 0
      ? relevant.filter(c => { const vr = validationStore[c.key]; return vr && vr.valid === true; })
      : relevant;
    return { filteredDone: pool.filter(c=>c.created).length, filteredTotal: pool.length };
  }, [ringTagSet, combos, locked, validationStore, done, total]);

  const pct = filteredTotal === 0 ? 0 : Math.round((filteredDone / filteredTotal) * 100);
  const r=54, circ=2*Math.PI*r, offset=circ-(pct/100)*circ;
  const isFiltered = ringTagSet.size > 0;

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Tag filter pills for the ring */}
      <div className="flex gap-1 flex-wrap justify-end">
        <button onClick={()=>setRingTagSet(new Set())}
          className={`px-2 py-0.5 text-xs rounded-full font-medium transition-colors ${!isFiltered?"bg-amber-500 text-black":"bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>
          All
        </button>
        {ALL_TAGS.filter(t=>t!=="All").map(t=>(
          <button key={t} onClick={()=>setRingTagSet(prev=>{ const n=new Set(prev); n.has(t)?n.delete(t):n.add(t); return n; })}
            className={`px-2 py-0.5 text-xs rounded-full font-medium transition-colors ${ringTagSet.has(t)?"bg-amber-500 text-black":"bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Created</div>
          <div className="text-2xl font-black">
            <span className="text-amber-400">{filteredDone}</span>
            <span className="text-zinc-600 text-lg"> / {filteredTotal}</span>
          </div>
          {isFiltered && <div className="text-xs text-amber-400 mt-0.5">{[...ringTagSet].join(" + ")}</div>}
        </div>
        <div className="relative flex items-center justify-center" style={{width:120,height:120}}>
          <svg width="120" height="120" className="-rotate-90">
            <circle cx="60" cy="60" r={46} stroke="#27272a" strokeWidth="9" fill="none"/>
            <circle cx="60" cy="60" r={46} stroke="#f59e0b" strokeWidth="9" fill="none"
              strokeDasharray={2*Math.PI*46} strokeDashoffset={2*Math.PI*46-(pct/100)*2*Math.PI*46}
              strokeLinecap="round" style={{transition:"stroke-dashoffset 0.6s ease"}}/>
          </svg>
          <div className="absolute text-center">
            <div className="text-2xl font-black text-white">{pct}%</div>
            <div className="text-xs text-zinc-400">{filteredDone}/{filteredTotal}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpeakerCombobox({ value, onChange, speakers }) {
  const rosterNames = (speakers||[]).map(s=>s.name);
  const isOther = value && !rosterNames.includes(value);
  const selectVal = isOther ? "__other__" : (value||"");

  const handleSelect = (e) => {
    const v = e.target.value;
    if (v === "__other__") { onChange(""); }
    else { onChange(v); }
  };

  return (
    <div className="flex gap-2">
      <select
        value={selectVal}
        onChange={handleSelect}
        className="flex-1 bg-zinc-900 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-amber-500"
      >
        <option value="">— No speaker —</option>
        {rosterNames.length>0&&<optgroup label="Roster">
          {rosterNames.map(n=><option key={n} value={n}>{n}</option>)}
        </optgroup>}
        <option value="__other__">Other (type name)…</option>
      </select>
      {(selectVal==="__other__"||isOther)&&(
        <input
          value={value||""}
          onChange={e=>onChange(e.target.value)}
          placeholder="Type speaker name"
          autoFocus
          className="flex-1 bg-zinc-900 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
        />
      )}
    </div>
  );
}

function AssetRow({ item, onDelete, onUpdate, validMark, speakers, selected, onSelect }) {
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(item);
  const [videoPanel,setVideoPanel]=useState(false);
  const [driveMode,setDriveMode]=useState(item.driveUrl?"drive":"upload");
  const hasVideo=item.videoFileName||item.driveUrl;
  const borderColor=selected?"border-amber-500/50":validMark==="valid"?"border-emerald-500/25":validMark==="invalid"?"border-red-500/20":"border-zinc-700/50";
  const bgColor=selected?"bg-amber-500/5":validMark==="valid"?"bg-emerald-500/5":validMark==="invalid"?"bg-red-500/5":"bg-zinc-800/60";


  if (editing) return (
    <div className={`rounded-lg border ${bgColor} border-amber-500/40 p-3 space-y-2`}>
      <div className="flex gap-2 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">ID</label>
          <input value={draft.id} onChange={e=>setDraft(d=>({...d,id:e.target.value}))}
            className="w-28 bg-zinc-900 border border-zinc-600 rounded px-2 py-1.5 text-sm text-amber-400 font-mono focus:outline-none focus:border-amber-500"/>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <label className="text-xs text-zinc-500">Descriptor</label>
          <input value={draft.descriptor} onChange={e=>setDraft(d=>({...d,descriptor:e.target.value}))} placeholder="e.g. kitchen, sitting at desk"
            className="w-full bg-zinc-900 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-amber-500"/>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Tag</label>
          <select value={draft.tag} onChange={e=>setDraft(d=>({...d,tag:e.target.value}))}
            className="bg-zinc-900 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-amber-500">
            {ASSET_TAGS.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        {"universal" in draft&&(
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500">Validation</label>
            <label className="flex items-center gap-1.5 cursor-pointer mt-1.5">
              <input type="checkbox" checked={!!draft.universal} onChange={e=>setDraft(d=>({...d,universal:e.target.checked}))} className="accent-teal-500 w-3.5 h-3.5"/>
              <span className={`text-xs font-semibold ${draft.universal?"text-teal-400":"text-zinc-500"}`}>{draft.universal?"Universal":"Selective"}</span>
            </label>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-500">Speaker / Actor</label>
        <SpeakerCombobox value={draft.speaker} onChange={v=>setDraft(d=>({...d,speaker:v}))} speakers={speakers}/>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-500">Script text</label>
        <textarea value={draft.text} onChange={e=>setDraft(d=>({...d,text:e.target.value}))} rows={3}
          className="w-full bg-zinc-900 border border-zinc-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"/>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={()=>{onUpdate(draft);setEditing(false);}} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded">Save</button>
        <button onClick={()=>setEditing(false)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium rounded">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className={`rounded-lg border ${bgColor} ${borderColor} group`}>
      <div className="flex items-start gap-3 p-3">
        <input
          type="checkbox"
          checked={!!selected}
          onChange={e=>{e.stopPropagation();onSelect&&onSelect(e.target.checked);}}
          onClick={e=>e.stopPropagation()}
          className="mt-1 shrink-0 w-3.5 h-3.5 accent-amber-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
          style={selected?{opacity:1}:{}}
        />
        <div className="flex-shrink-0 pt-0.5">
          <div className="font-mono text-amber-400 text-sm font-bold">{item.id}</div>
          {item.descriptor&&<div className="text-zinc-500 text-xs mt-0.5 italic">"{item.descriptor}"</div>}
        </div>
        <div className="flex-1 min-w-0 text-zinc-300 text-sm leading-snug">{item.text}</div>
        <div className="flex items-center gap-1.5 shrink-0">
          {validMark==="valid"&&<span className="text-emerald-400 text-xs">✓</span>}
          {validMark==="invalid"&&<span className="text-red-400 text-xs">✗</span>}
          <Tag tag={item.tag}/>
          {"universal" in item&&<span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${item.universal?"bg-teal-500/15 text-teal-300 border-teal-500/30":"bg-zinc-700 text-zinc-400 border-zinc-600"}`}>{item.universal?"Universal":"Selective"}</span>}
          {item.speaker&&<span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-teal-500/15 text-teal-300 border-teal-500/30">{item.speaker}</span>}
          <button onClick={()=>setVideoPanel(v=>!v)} className={`text-sm ${hasVideo?"text-amber-400":"text-zinc-600 hover:text-zinc-300"}`}>{hasVideo?"🎬":"📎"}</button>
          <button onClick={()=>{setDraft({...item});setEditing(true);}} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-amber-400 transition-all text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-amber-500/40">Edit</button>
          <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all text-xl leading-none">×</button>
        </div>
      </div>
      {videoPanel&&(
        <div className="px-3 pb-3">
          <div className="p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-700/40 space-y-2">
            <div className="flex gap-1">
              {["upload","drive"].map(m=>(
                <button key={m} onClick={()=>setDriveMode(m)}
                  className={`px-2.5 py-1 text-xs rounded font-medium ${driveMode===m?"bg-zinc-700 text-white":"text-zinc-500 hover:text-zinc-300"}`}>
                  {m==="upload"?"📁 Upload file":"🔗 Drive link"}
                </button>
              ))}
            </div>
            {driveMode==="upload"?(
              <label className="flex items-center gap-2 cursor-pointer group w-fit">
                <span className="text-xs px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 group-hover:border-amber-500 transition-colors">
                  {item.videoFileName?`✓ ${item.videoFileName}`:"Choose video file..."}
                </span>
                <input type="file" accept="video/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)onUpdate({videoFileName:f.name,driveUrl:""}); }}/>
              </label>
            ):(
              <div className="flex items-center gap-2">
                <input defaultValue={item.driveUrl} onBlur={e=>onUpdate({driveUrl:e.target.value,videoFileName:""})} placeholder="Paste Google Drive share link..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"/>
                {item.driveUrl&&<a href={item.driveUrl} target="_blank" rel="noreferrer" className="text-amber-400 text-xs">Open ↗</a>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddAssetForm({ onAdd, prefix, singularLabel, speakers, showUniversal }) {
  const [id,setId]=useState(""); const [descriptor,setDescriptor]=useState(""); const [text,setText]=useState(""); const [tag,setTag]=useState("Founder"); const [speaker,setSpeaker]=useState(""); const [universal,setUniversal]=useState(true);

  const submit=()=>{ if(!id.trim()||!text.trim()) return; onAdd({id:id.trim(),descriptor:descriptor.trim(),text:text.trim(),tag,speaker:speaker.trim(),driveUrl:"",videoFileName:"",...(showUniversal?{universal}:{})}); setId("");setDescriptor("");setText("");setSpeaker(""); };
  return (
    <div className="mt-3 p-3 rounded-lg border border-dashed border-zinc-600/60 bg-zinc-900/40">
      <div className="flex gap-2 mb-2 flex-wrap">
        <input value={id} onChange={e=>setId(e.target.value)} placeholder={`e.g. ${prefix}4 or ${prefix}5a`}
          className="w-28 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-amber-500"/>
        <input value={descriptor} onChange={e=>setDescriptor(e.target.value)} placeholder="descriptor (optional)"
          className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-amber-500"/>
        <select value={tag} onChange={e=>setTag(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-amber-500">
          {ASSET_TAGS.map(t=><option key={t}>{t}</option>)}
        </select>
        {showUniversal&&(
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={universal} onChange={e=>setUniversal(e.target.checked)} className="accent-teal-500 w-3.5 h-3.5"/>
            <span className={`text-xs font-semibold ${universal?"text-teal-400":"text-zinc-500"}`}>{universal?"Universal":"Selective"}</span>
          </label>
        )}
      </div>
      <div className="mb-2">
        <SpeakerCombobox value={speaker} onChange={setSpeaker} speakers={speakers}/>
      </div>
      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder={`Enter ${singularLabel.toLowerCase()} script text...`} rows={2}
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-none"/>
      {showUniversal&&<p className="text-xs text-zinc-600 mt-1">{universal?"Universal — works with any hook/lead, auto-approved in validator.":"Selective — will be validated by AI for each hook/lead combo."}</p>}
      <button onClick={submit} className="mt-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold rounded">+ Add {singularLabel}</button>
    </div>
  );
}

function SpeakerRoster({ speakers, setSpeakers }) {
  const [open,setOpen]=useState(false);
  const [newName,setNewName]=useState("");
  const [newRole,setNewRole]=useState("Founder");
  const [editId,setEditId]=useState(null);
  const [editName,setEditName]=useState("");
  const [editRole,setEditRole]=useState("Founder");

  const addSpeaker=()=>{
    if(!newName.trim()) return;
    setSpeakers(prev=>[...prev,{id:`sp${Date.now()}`,name:newName.trim(),role:newRole}]);
    setNewName(""); setNewRole("Founder");
  };
  const startEdit=(s)=>{ setEditId(s.id); setEditName(s.name); setEditRole(s.role||"Founder"); };
  const saveEdit=()=>{ setSpeakers(prev=>prev.map(s=>s.id===editId?{...s,name:editName.trim(),role:editRole}:s)); setEditId(null); };
  const deleteSpeaker=(id)=>setSpeakers(prev=>prev.filter(s=>s.id!==id));

  return (
    <div className="mb-5 rounded-lg border border-zinc-700/50 bg-zinc-800/40">
      <button onClick={()=>setOpen(o=>!o)} className="w-full flex items-center justify-between px-4 py-2.5 text-left">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Speakers / Actors</span>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{speakers.length}</span>
        </div>
        <span className="text-zinc-500 text-xs">{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div className="px-4 pb-4 space-y-2">
          {speakers.length===0&&<div className="text-zinc-600 text-xs py-1">No speakers yet. Add one below.</div>}
          {speakers.map(s=>(
            <div key={s.id} className="flex items-center gap-2">
              {editId===s.id?(
                <>
                  <input value={editName} onChange={e=>setEditName(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-sm text-zinc-300 focus:outline-none focus:border-amber-500"/>
                  <select value={editRole} onChange={e=>setEditRole(e.target.value)}
                    className="bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-sm text-zinc-300 focus:outline-none focus:border-amber-500">
                    {ASSET_TAGS.filter(t=>t!=="Any").map(t=><option key={t}>{t}</option>)}
                  </select>
                  <button onClick={saveEdit} className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded">Save</button>
                  <button onClick={()=>setEditId(null)} className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded">Cancel</button>
                </>
              ):(
                <>
                  <span className="flex-1 text-sm text-zinc-300">{s.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-teal-500/15 text-teal-300 border-teal-500/30">{s.name}</span>
                  <Tag tag={s.role||"Any"}/>
                  <button onClick={()=>startEdit(s)} className="text-zinc-500 hover:text-amber-400 text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-amber-500/40">Edit</button>
                  <button onClick={()=>deleteSpeaker(s.id)} className="text-zinc-600 hover:text-red-400 text-xl leading-none">×</button>
                </>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-1 border-t border-zinc-700/40">
            <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addSpeaker()} placeholder="Name (e.g. Alex)"
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-amber-500"/>
            <select value={newRole} onChange={e=>setNewRole(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-amber-500">
              {ASSET_TAGS.filter(t=>t!=="Any").map(t=><option key={t}>{t}</option>)}
            </select>
            <button onClick={addSpeaker} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded">+ Add</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CSV helpers ───────────────────────────────────────────────────────────
function parseCSVText(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,'').toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = [];
    let inQuote = false, cur = '';
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    values.push(cur.trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || '').replace(/^"|"$/g,''); });
    rows.push(row);
  }
  return rows;
}

const CSV_TEMPLATE = `type,id,descriptor,text,tag,speaker,driveUrl
hook,H1a,founder at desk,My businesses do over $1m a month and I started with nothing.,Founder,Alex,
hook,H2a,outdoor casual,Real talk — here's exactly what's been working for us this month.,UGC,Jansen,
lead,L1,,The problem isn't your product. It's how you're leading with it.,Founder,Alex,
body,B1,,We restructured our approach and saw a 3x improvement in two weeks.,Any,,
cta,CTA1,direct link,Click below to get the free framework.,Any,,
prehook,PH1,AI avatar intro,Hey before you scroll — this is worth 30 seconds.,AI,,`;

function BulkImportModal({ onClose, speakers, onImport }) {
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const TYPE_MAP = { prehook:'prehooks', hook:'hooks', lead:'leads', body:'bodies', cta:'ctas' };

  const handleParse = (text) => {
    setError('');
    const rows = parseCSVText(text);
    if (!rows.length) { setError('No data rows found. Check your CSV format.'); setPreview(null); return; }
    const buckets = { prehooks:[], hooks:[], leads:[], bodies:[], ctas:[] };
    const errs = [];
    rows.forEach((r, i) => {
      const type = TYPE_MAP[r.type?.toLowerCase?.()];
      if (!type) { errs.push(`Row ${i+2}: unknown type "${r.type}"`); return; }
      if (!r.id?.trim()) { errs.push(`Row ${i+2}: missing id`); return; }
      if (!r.text?.trim()) { errs.push(`Row ${i+2}: missing text`); return; }
      const validTags = ['Founder','UGC','AI','VO','Any'];
      const tag = validTags.includes(r.tag) ? r.tag : 'Any';
      buckets[type].push({ id:r.id.trim(), descriptor:(r.descriptor||'').trim(), text:r.text.trim(), tag, speaker:(r.speaker||'').trim(), driveUrl:(r.driveurl||r.driveUrl||'').trim(), videoFileName:'' });
    });
    if (errs.length) { setError(errs.join('\n')); }
    setPreview({ buckets, total: rows.length - errs.length });
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const t = ev.target.result; setCsvText(t); handleParse(t); };
    reader.readAsText(f);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'avs-import-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = () => {
    if (!preview) return;
    onImport(preview.buckets);
    onClose();
  };

  const counts = preview ? Object.entries(preview.buckets).filter(([,v])=>v.length>0) : [];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h2 className="text-white font-bold text-base">Bulk Import Assets</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Upload or paste a CSV file to add assets in bulk</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="p-4 space-y-4">
          {/* Template + CSV format info */}
          <div className="p-3 bg-zinc-800/60 rounded-lg border border-zinc-700/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Required CSV columns</span>
              <button onClick={downloadTemplate} className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded">⬇ Download template</button>
            </div>
            <div className="font-mono text-xs text-zinc-400 bg-zinc-900 rounded px-3 py-2 overflow-x-auto whitespace-nowrap">
              type, id, descriptor, text, tag, speaker, driveUrl
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-500">
              <div><span className="text-zinc-300 font-medium">type</span> — prehook, hook, lead, body, cta</div>
              <div><span className="text-zinc-300 font-medium">tag</span> — Founder, UGC, AI, VO, Any</div>
              <div><span className="text-zinc-300 font-medium">id</span> — unique ID (e.g. H1a, L3)</div>
              <div><span className="text-zinc-300 font-medium">speaker</span> — optional name (e.g. Alex)</div>
              <div><span className="text-zinc-300 font-medium">text</span> — script text (required)</div>
              <div><span className="text-zinc-300 font-medium">descriptor</span> — optional short label</div>
            </div>
          </div>

          {/* Upload */}
          <div className="flex gap-2 items-center">
            <label className="cursor-pointer px-3 py-1.5 bg-zinc-800 border border-zinc-600 hover:border-amber-500 text-zinc-300 text-xs rounded transition-colors">
              📁 Choose CSV file
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile}/>
            </label>
            <span className="text-xs text-zinc-600">or paste below</span>
          </div>

          {/* Paste */}
          <textarea
            value={csvText}
            onChange={e=>{ setCsvText(e.target.value); setPreview(null); setError(''); }}
            placeholder={`Paste CSV here...\n\ntype,id,descriptor,text,tag,speaker,driveUrl\nhook,H1a,founder at desk,My businesses do over $1m...,Founder,Alex,`}
            rows={6}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono resize-none"
          />
          <button
            onClick={()=>handleParse(csvText)}
            disabled={!csvText.trim()}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white text-sm font-medium rounded">
            Preview import
          </button>

          {/* Errors */}
          {error&&<div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 whitespace-pre-wrap">{error}</div>}

          {/* Preview */}
          {preview&&(
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-white font-medium">{preview.total} row{preview.total!==1?'s':''} ready to import:</span>
                {counts.map(([type,items])=>(
                  <span key={type} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                    {items.length} {type}
                  </span>
                ))}
              </div>
              <div className="overflow-x-auto rounded border border-zinc-700">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-800 text-zinc-400">
                    <tr>{['type','id','descriptor','tag','speaker','text'].map(h=><th key={h} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {counts.flatMap(([,items])=>items).slice(0,50).map((r,i)=>(
                      <tr key={i} className="text-zinc-300 hover:bg-zinc-800/50">
                        <td className="px-2 py-1.5 font-mono text-amber-400">{Object.entries(TYPE_MAP).find(([,v])=>v===Object.entries(TYPE_MAP).find(([,v2])=>v2===Object.keys(preview.buckets).find(k=>preview.buckets[k].includes(r)))?.[1])?.[0]||'?'}</td>
                        <td className="px-2 py-1.5 font-mono text-amber-400">{r.id}</td>
                        <td className="px-2 py-1.5 text-zinc-400 italic">{r.descriptor||'—'}</td>
                        <td className="px-2 py-1.5"><Tag tag={r.tag}/></td>
                        <td className="px-2 py-1.5">{r.speaker?<span className="px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">{r.speaker}</span>:'—'}</td>
                        <td className="px-2 py-1.5 max-w-xs truncate text-zinc-400">{r.text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.total>50&&<div className="text-center text-xs text-zinc-600 py-2">…and {preview.total-50} more rows</div>}
              </div>
              <button onClick={doImport} className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-lg">
                Import {preview.total} asset{preview.total!==1?'s':''} →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LibraryTab({ preHooks,setPreHooks,hooks,transitions,setTransitions,leads,bodies,ctas,setHooks,setLeads,setBodies,setCtas,validationStore,speakers,setSpeakers }) {
  const [activeSection,setActiveSection]=useState("All");
  const [tagSet,setTagSet]=useState(new Set());
  const [search,setSearch]=useState("");
  const [speakerFilter,setSpeakerFilter]=useState("All");
  const [showImport,setShowImport]=useState(false);
  const [selectedIds,setSelectedIds]=useState(new Set());
  const [uploadState,setUploadState]=useState(null); // null | {running,total,done,current,errors[]}
  const ffmpegRef = useRef(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  const ensureFFmpeg = async () => {
    if (!ffmpegRef.current) { const { FFmpeg } = await import("@ffmpeg/ffmpeg"); ffmpegRef.current = new FFmpeg(); }
    if (!ffmpegLoaded) {
      const { toBlobURL } = await import("@ffmpeg/util");
      const base = "https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm";
      await ffmpegRef.current.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      });
      setFfmpegLoaded(true);
    }
    return ffmpegRef.current;
  };

  const toggleSelect=(key,val)=>setSelectedIds(prev=>{ const n=new Set(prev); val?n.add(key):n.delete(key); return n; });
  const toggleSelectAll=(label,items)=>{
    const keys=items.map(i=>`${label}|${i.id}`);
    const allSel=keys.length>0&&keys.every(k=>selectedIds.has(k));
    setSelectedIds(prev=>{ const n=new Set(prev); allSel?keys.forEach(k=>n.delete(k)):keys.forEach(k=>n.add(k)); return n; });
  };
  const deleteSelected=()=>{
    sections.forEach(({label,setter})=>{
      const toDelete=new Set([...selectedIds].filter(k=>k.startsWith(label+"|")).map(k=>k.slice(label.length+1)));
      if(toDelete.size>0) setter(prev=>prev.filter(i=>!toDelete.has(i.id)));
    });
    setSelectedIds(new Set());
  };
  const sections=[
    {label:"Pre-hooks",   items:preHooks,   setter:setPreHooks,   prefix:"PH",  singular:"Pre-hook",   showUniversal:false},
    {label:"Hooks",       items:hooks,      setter:setHooks,      prefix:"H",   singular:"Hook",       showUniversal:false},
    {label:"Leads",       items:leads,      setter:setLeads,      prefix:"L",   singular:"Lead",       showUniversal:false},
    {label:"Transitions", items:transitions,setter:setTransitions,prefix:"T",   singular:"Transition", showUniversal:true },
    {label:"Bodies",      items:bodies,     setter:setBodies,     prefix:"B",   singular:"Body",       showUniversal:false},
    {label:"CTAs",        items:ctas,       setter:setCtas,       prefix:"CTA", singular:"CTA",        showUniversal:false},
  ];
  const hookMarks=useMemo(()=>{ const m={}; Object.values(validationStore).forEach(v=>{ const hid=v.hookId; if(!(hid in m)) m[hid]=v.valid; else if(m[hid]!==v.valid) m[hid]="mixed"; }); return m; },[validationStore]);
  const leadMarks=useMemo(()=>{ const m={}; Object.values(validationStore).forEach(v=>{ const lid=v.leadId; if(!(lid in m)) m[lid]=v.valid; else if(m[lid]!==v.valid) m[lid]="mixed"; }); return m; },[validationStore]);
  const getMark=(label,id)=>{ const val=label==="Hooks"?hookMarks[id]:label==="Leads"?leadMarks[id]:undefined; if(val===true) return "valid"; if(val===false) return "invalid"; return undefined; };
  const filterItems=items=>items.filter(i=>{
    const matchSearch=search===""||i.id.toLowerCase().includes(search.toLowerCase())||i.text.toLowerCase().includes(search.toLowerCase())||(i.descriptor||"").toLowerCase().includes(search.toLowerCase())||(i.speaker||"").toLowerCase().includes(search.toLowerCase());
    const matchSpeaker=speakerFilter==="All"||(speakerFilter==="(none)"?(!(i.speaker||"").trim()):(i.speaker||""===speakerFilter||(i.speaker||"")===speakerFilter));
    return tagMatch(i.tag,tagSet)&&matchSearch&&matchSpeaker;
  });
  const updateItem=(setter,id,patch)=>setter(prev=>prev.map(i=>i.id===id?{...i,...patch}:i));
  const visibleSections=sections.filter(s=>activeSection==="All"||s.label===activeSection);

  // All speaker names: roster first, then any ad-hoc names on assets not in roster
  const allSpeakerNames=useMemo(()=>{
    const rosterNames=speakers.map(s=>s.name);
    const assetNames=[...preHooks,...hooks,...transitions,...leads,...bodies,...ctas].map(i=>i.speaker).filter(Boolean);
    const combined=new Set([...rosterNames,...assetNames]);
    return [...combined].sort();
  },[speakers,preHooks,hooks,leads,bodies,ctas]);

  const handleImport=(buckets)=>{
    if(buckets.prehooks?.length)     setPreHooks(prev=>[...prev,...buckets.prehooks]);
    if(buckets.hooks?.length)        setHooks(prev=>[...prev,...buckets.hooks]);
    if(buckets.transitions?.length)  setTransitions(prev=>[...prev,...buckets.transitions]);
    if(buckets.leads?.length)        setLeads(prev=>[...prev,...buckets.leads]);
    if(buckets.bodies?.length)       setBodies(prev=>[...prev,...buckets.bodies]);
    if(buckets.ctas?.length)         setCtas(prev=>[...prev,...buckets.ctas]);
  };

  const handleUploadAllToStorage = async () => {
    const STITCH_URL = "https://avs-stitch-server-production.up.railway.app";
    const clientId = localStorage.getItem("avs_active_client") || "default";
    const sb = getSupabase();
    if (!sb) { alert("Connect Supabase in Admin settings first."); return; }
    const toUpload = [];
    sections.forEach(({ label, items }) => {
      items.forEach(item => { if (item.driveUrl && !item.storagePath) toUpload.push({ ...item, _label: label }); });
    });
    if (!toUpload.length) { alert("All clips with Drive URLs are already in storage."); return; }
    setUploadState({ running: true, total: toUpload.length, done: 0, current: "", errors: [] });

    for (let i = 0; i < toUpload.length; i++) {
      const asset = toUpload[i];
      setUploadState(s => ({ ...s, done: i, current: asset.id }));
      try {
        const resp = await fetch(`${STITCH_URL}/api/normalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetId: asset.id,
            clientId,
            driveUrl: asset.driveUrl,
            supabaseUrl: sb.url,
            supabaseKey: sb.key,
          }),
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: resp.statusText }));
          throw new Error(err.error || resp.statusText);
        }
        const { storagePath } = await resp.json();
        sections.forEach(({ label, setter }) => {
          if (label === asset._label) setter(prev => prev.map(a => a.id === asset.id ? { ...a, storagePath } : a));
        });
      } catch (err) {
        setUploadState(s => ({ ...s, errors: [...s.errors, `${asset.id}: ${err.message}`] }));
      }
    }
    setUploadState(s => ({ ...s, running: false, done: s.total, current: "" }));
  };

  return (
    <div>
      {showImport&&<BulkImportModal onClose={()=>setShowImport(false)} speakers={speakers} onImport={handleImport}/>}
      <SpeakerRoster speakers={speakers} setSpeakers={setSpeakers}/>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {["All","Pre-hooks","Hooks","Leads","Bodies","CTAs"].map(t=>(
            <button key={t} onClick={()=>setActiveSection(t)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium ${activeSection===t?"bg-zinc-700 text-white":"bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"}`}>{t}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setShowImport(true)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 hover:border-amber-500 text-zinc-300 text-xs font-medium rounded-lg transition-colors">
            ⬆ Bulk Import CSV
          </button>
          <button onClick={handleUploadAllToStorage} disabled={uploadState?.running}
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">
            ☁ Upload All to Storage
          </button>
          <button onClick={()=>{
            if(!confirm("Clear all storage paths? This lets you re-upload from scratch without deleting files from Supabase.")) return;
            sections.forEach(({setter})=>setter(prev=>prev.map(a=>({...a,storagePath:undefined}))));
          }} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-400 text-xs font-medium rounded-lg transition-colors">
            ↺ Reset Paths
          </button>
        </div>
      </div>
      {uploadState&&(
        <div className="mb-4 p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-2">
          {uploadState.running ? (
            <div className="flex items-center gap-3">
              <span className="text-violet-400 text-xs animate-pulse">☁ Normalizing & uploading {uploadState.current}… ({uploadState.done}/{uploadState.total})</span>
              <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                <div className="bg-violet-500 h-1.5 rounded-full transition-all" style={{width:`${(uploadState.done/uploadState.total)*100}%`}}/>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 text-xs">✅ Done — {uploadState.total - uploadState.errors.length}/{uploadState.total} clips uploaded to Supabase Storage</span>
              <button onClick={()=>setUploadState(null)} className="text-zinc-500 text-xs hover:text-zinc-300">✕</button>
            </div>
          )}
          {uploadState.errors.length>0&&(
            <div className="text-red-400 text-xs space-y-0.5">
              {uploadState.errors.map((e,i)=><div key={i}>❌ {e}</div>)}
            </div>
          )}
        </div>
      )}
      <FilterBar tagSet={tagSet} setTagSet={setTagSet} search={search} setSearch={setSearch} placeholder="Search ID, text, descriptor or speaker..."/>
      {/* Combined tag + speaker filter row */}
      {allSpeakerNames.length>0&&(
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-zinc-500 shrink-0">Speaker:</span>
          {["All","(none)",...allSpeakerNames].map(sp=>{
            const active=speakerFilter===sp;
            // Find role for roster speakers to show tag color hint
            const rosterEntry=speakers.find(s=>s.name===sp);
            return (
              <button key={sp} onClick={()=>setSpeakerFilter(sp)}
                className={`px-2.5 py-0.5 text-xs rounded-full font-medium transition-colors border ${active?"bg-teal-500/30 text-teal-300 border-teal-500/50":"bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300"}`}>
                {sp}{rosterEntry&&sp!=="All"&&sp!=="(none)"?<span className={`ml-1 opacity-60`}>({rosterEntry.role})</span>:null}
              </button>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visibleSections.map(({label,items,setter,prefix,singular,showUniversal})=>{
          const filtered=filterItems(items);
          const allSel=filtered.length>0&&filtered.every(i=>selectedIds.has(`${label}|${i.id}`));
          const someSel=filtered.some(i=>selectedIds.has(`${label}|${i.id}`));
          return (
            <div key={label}>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={allSel}
                  ref={el=>{ if(el) el.indeterminate=someSel&&!allSel; }}
                  onChange={()=>toggleSelectAll(label,filtered)}
                  className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
                  title={allSel?"Deselect all":"Select all"}
                />
                <h3 className="text-white font-bold text-sm uppercase tracking-widest">{label}</h3>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{filtered.length}</span>
              </div>
              <div className="space-y-2">
                {filtered.map(item=>{
                  const key=`${label}|${item.id}`;
                  return (
                    <AssetRow key={item.id} item={item} validMark={getMark(label,item.id)} speakers={speakers}
                      selected={selectedIds.has(key)}
                      onSelect={val=>toggleSelect(key,val)}
                      onUpdate={patch=>updateItem(setter,item.id,patch)}
                      onDelete={()=>{ setter(prev=>prev.filter(i=>i.id!==item.id)); setSelectedIds(prev=>{ const n=new Set(prev); n.delete(key); return n; }); }}/>
                  );
                })}
                {filtered.length===0&&<div className="text-zinc-600 text-sm py-3 text-center">No items match filter.</div>}
              </div>
              {(activeSection==="All"||activeSection===label)&&<AddAssetForm prefix={prefix} singularLabel={singular} speakers={speakers} showUniversal={showUniversal} onAdd={item=>setter(prev=>[...prev,item])}/>}
            </div>
          );
        })}
      </div>

      {/* Floating bulk action bar */}
      {selectedIds.size>0&&(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-zinc-900 border border-amber-500/40 rounded-full shadow-2xl shadow-black/60">
          <span className="text-sm text-white font-semibold">{selectedIds.size} selected</span>
          <span className="text-zinc-600">|</span>
          <button onClick={()=>setSelectedIds(new Set())} className="text-xs text-zinc-400 hover:text-white transition-colors">Clear</button>
          <button
            onClick={()=>{ if(window.confirm(`Delete ${selectedIds.size} item${selectedIds.size!==1?"s":""}? This cannot be undone.`)) deleteSelected(); }}
            className="px-3 py-1.5 bg-red-500 hover:bg-red-400 text-white text-xs font-bold rounded-full transition-colors">
            🗑 Delete {selectedIds.size}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Validation prompts by mode ─────────────────────────────────────────────
function buildPrompt(hook, lead, transition, body, cta, mode) {
  const transPart=transition?`\nTransition: "${transition.text}"${transition.universal?" (universal — assume this bridge always works; evaluate hook/lead/body/CTA flow only)":""}`:""
  const bodyPart=body?`\nBody: "${body.text}"`:""
  const ctaPart=cta?`\nCTA: "${cta.text}"`:""
  if (mode==="grammar") {
    return `You are a strict video ad script editor. Your job is to decide whether these segments can be stitched together and played back-to-back without confusing or losing the viewer.

Hook: "${hook.text}"
Lead: "${lead.text}"${transPart}${bodyPart}${ctaPart}

Mark as INVALID if ANY of the following are true:
- The lead starts with a connector word (but, and, so, because) that does NOT logically continue the specific thought from the hook
- The lead introduces a completely new subject with no bridge from what the hook just said
- A viewer hearing these back-to-back would feel a jarring jump or be confused about who is speaking or what the point is
- The perspective or subject suddenly shifts (e.g. hook is about the speaker, lead is about the viewer) with no connecting logic
- Tonal mismatch — e.g. raw/casual hook followed by a formal or structured lead
- If a transition is present, it must bridge lead to body naturally — evaluate the full lead→transition→body flow

Mark as VALID only if the segments flow directly and logically from exactly what was said before — as if it were one continuous sentence or thought.

Be strict. If there is any doubt about whether a real viewer would feel a disconnect, mark it invalid.

Respond ONLY in this exact JSON format with no other text:
{"valid": true or false, "reason": "One sentence identifying the specific connection or the exact point of disconnect."}`;
  }
  return `You are a strict video ad script editor evaluating whether these segments work as a cohesive narrative when played back-to-back.

Hook: "${hook.text}"
Lead: "${lead.text}"${transPart}${bodyPart}${ctaPart}

Mark as INVALID if ANY of the following are true:
- The lead does not follow from the hook's specific premise, claim, or emotional direction
- If a transition is present, it must connect lead to body — a transition that doesn't bridge the gap makes the combo invalid
- The body (if present) does not deliver on what the hook and lead set up
- The CTA (if present) feels disconnected in tone or energy from the rest
- There is no clear logical throughline a viewer could follow from start to finish
- The viewer would need a mental leap or missing context to connect the segments

Mark as VALID only if every segment follows naturally from the last — a viewer should feel it was written as one unified script.

Be strict. If the narrative connection requires a stretch, mark it invalid.

Respond ONLY in this exact JSON format with no other text:
{"valid": true or false, "reason": "One sentence explaining the specific narrative connection or the exact point of breakdown."}`;
}

async function callValidate(hook, lead, transition, body, cta, mode, apiKey) {
  if(!apiKey) throw new Error("No API key");
  const prompt=buildPrompt(hook,lead,transition,body,cta,mode);
  const res=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:300,messages:[{role:"user",content:prompt}]}),
  });
  if(!res.ok) throw new Error(`API error ${res.status}`);
  const data=await res.json();
  const raw=data.content?.map(b=>b.text||"").join("")||"";
  return JSON.parse(raw.replace(/```json|```/g,"").trim());
}

function AssetChip({ item, selected, onToggle }) {
  return (
    <button onClick={()=>onToggle(item.id)}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
        ${selected?"bg-amber-500/20 border-amber-500/50 text-amber-300":"bg-zinc-800/60 border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"}`}>
      <span className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${selected?"bg-amber-500 border-amber-500":"border-zinc-600"}`}>
        {selected&&<span className="text-black text-xs leading-none font-bold">✓</span>}
      </span>
      <span className="font-mono font-bold">{item.id}</span>
      {item.descriptor&&<span className="text-zinc-500 italic truncate max-w-20">({item.descriptor})</span>}
      <Tag tag={item.tag}/>
    </button>
  );
}

// ── Result card — dropdown override, expandable preview ───────────────────
function ResultCard({ result, hookText, leadText, bodyText, ctaText, onOverride, onMarkReviewed, validationMode, rowNum, selected, onSelect }) {
  const [expanded,setExpanded]=useState(false);
  const isManual=result.manual;
  const isReviewed=!!result.reviewed;
  const borderColor=selected?"border-amber-500/60":isReviewed?"border-teal-500/40":isManual?"border-amber-500/40":result.valid===true?"border-emerald-500/25":result.valid===false?"border-red-500/25":"border-zinc-700/40";
  const bgColor=selected?"bg-amber-500/8":isManual?"bg-amber-500/8":result.valid===true?"bg-emerald-500/8":result.valid===false?"bg-red-500/8":"bg-zinc-800/40";

  return (
    <div className={`rounded-xl border ${bgColor} ${borderColor} overflow-hidden`}>
      <div className="flex items-center gap-2 p-3 flex-wrap">
        {/* Select checkbox */}
        {onSelect&&<input type="checkbox" checked={!!selected} onChange={e=>onSelect(e.target.checked)}
          onClick={e=>e.stopPropagation()}
          className="accent-amber-500 w-3.5 h-3.5 shrink-0 cursor-pointer"/>}
        {/* Row number */}
        {rowNum!=null&&<span className="text-zinc-600 text-xs font-mono shrink-0 w-6 text-right">#{rowNum}</span>}

        {/* Status icon */}
        <span className="text-base shrink-0">{result.valid===true?"✅":result.valid===false?"❌":"⚠️"}</span>

        {/* IDs */}
        <div className="flex items-center gap-1 flex-wrap shrink-0">
          <span className="font-mono text-amber-400 text-xs font-bold">{result.hookId}</span>
          <span className="text-zinc-600 text-xs">+</span>
          <span className="font-mono text-sky-400 text-xs font-bold">{result.leadId}</span>
          {result.transitionId&&<><span className="text-zinc-600 text-xs">+</span><span className="font-mono text-teal-400 text-xs font-bold">{result.transitionId}</span></>}
          {result.bodyId&&<><span className="text-zinc-600 text-xs">+</span><span className="font-mono text-purple-400 text-xs font-bold">{result.bodyId}</span></>}
          {result.ctaId&&<><span className="text-zinc-600 text-xs">+</span><span className="font-mono text-pink-400 text-xs font-bold">{result.ctaId}</span></>}
        </div>

        <Tag tag={result.hookTag}/>
        {isManual&&result.valid&&<span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full shrink-0">➡ In Tracker</span>}
        {isManual&&!result.valid&&<span className="text-xs bg-zinc-700/40 text-zinc-400 border border-zinc-600/30 px-1.5 py-0.5 rounded-full shrink-0">Manual</span>}
        {isReviewed&&!isManual&&<span className="text-xs bg-teal-500/20 text-teal-400 border border-teal-500/30 px-1.5 py-0.5 rounded-full shrink-0">✓ Reviewed</span>}

        {/* Reason */}
        <p className="text-zinc-400 text-xs leading-relaxed flex-1 min-w-0">{result.reason}</p>

        {/* Compact override dropdown */}
        <select
          value={result.valid===true?"valid":"invalid"}
          onChange={e=>onOverride(result.key, e.target.value==="valid")}
          className={`shrink-0 text-xs rounded border px-1.5 py-1 font-medium cursor-pointer focus:outline-none transition-colors
            ${result.valid===true
              ?"bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
              :"bg-red-500/15 border-red-500/40 text-red-400"}`}
          style={{WebkitAppearance:"none",appearance:"none",paddingRight:"1.5rem",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2020/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b7280'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 6px center"}}>
          <option value="valid">✅ Valid</option>
          <option value="invalid">❌ Invalid</option>
        </select>

        {/* Reviewed toggle */}
        <button
          onClick={()=>onMarkReviewed&&onMarkReviewed(result.key)}
          title={isReviewed?"Mark as unreviewed":"Mark as reviewed"}
          className={`shrink-0 text-xs px-2 py-1 rounded border font-medium transition-colors
            ${isReviewed
              ?"bg-teal-500/20 border-teal-500/40 text-teal-400 hover:bg-teal-500/10"
              :"bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-teal-400 hover:border-teal-500/40"}`}>
          {isReviewed?"✓":"Check"}
        </button>

        <button onClick={()=>setExpanded(v=>!v)} className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors shrink-0 whitespace-nowrap">
          {expanded?"Hide ▲":"Read ▼"}
        </button>
      </div>

      {/* Date bar — always visible */}
      <div className="flex items-center gap-4 px-3 pb-2 border-t border-zinc-700/20 pt-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-600 uppercase tracking-widest font-semibold">Date Validated</span>
          <span className="text-xs text-zinc-300 font-mono">{result.validatedAt ? fmtDate(result.validatedAt) : "—"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-600 uppercase tracking-widest font-semibold">In Tracker</span>
          <span className={`text-xs font-mono ${result.manual&&result.valid ? "text-amber-400" : "text-zinc-600"}`}>{result.manual&&result.valid ? "Yes" : "No"}</span>
        </div>
        {result.manual&&result.valid&&(
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-600 uppercase tracking-widest font-semibold">Date Added to Tracker</span>
            <span className="text-xs text-amber-400 font-mono">{result.addedToTrackerAt ? fmtDate(result.addedToTrackerAt) : "—"}</span>
          </div>
        )}
      </div>

      {expanded&&(
        <div className="border-t border-zinc-700/40 mx-3 mb-3 pt-3 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Script preview</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium
              ${validationMode==="grammar"
                ?"bg-sky-500/15 text-sky-400 border-sky-500/30"
                :"bg-violet-500/15 text-violet-400 border-violet-500/30"}`}>
              {validationMode==="grammar"?"Grammar / Flow":"Deep Validation"}
            </span>
          </div>
          {[
            {id:result.hookId,label:"Hook",color:"text-amber-400",  text:hookText},
            {id:result.leadId,label:"Lead",color:"text-sky-400",    text:leadText},
            ...(result.bodyId&&bodyText?[{id:result.bodyId,label:"Body",color:"text-purple-400",text:bodyText}]:[]),
            ...(result.ctaId&&ctaText?[{id:result.ctaId,label:"CTA",color:"text-pink-400",text:ctaText}]:[]),
          ].map((seg,i,arr)=>(
            <div key={seg.id} className="flex gap-2">
              <div className="flex flex-col items-end shrink-0" style={{width:52}}>
                <span className={`font-mono text-xs font-bold ${seg.color}`}>{seg.id}</span>
                {i<arr.length-1&&<div className="w-px flex-1 bg-zinc-700/60 min-h-3 mt-1 mx-auto"/>}
              </div>
              <div className={i<arr.length-1?"pb-2":""}>
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{seg.label}</div>
                <p className="text-zinc-200 text-sm leading-relaxed">{seg.text}</p>
              </div>
            </div>
          ))}
          <div className={`mt-2 p-2.5 rounded-lg text-xs leading-relaxed
            ${isManual?"bg-amber-500/10 text-amber-300 border border-amber-500/20"
            :result.valid===true?"bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
            :"bg-red-500/10 text-red-300 border border-red-500/20"}`}>
            <span className="font-semibold mr-1">
              {isManual?"✏️ Manual:"
              :result.valid===true?"✅ Why it works:"
              :"❌ Why it doesn't:"}
            </span>
            {result.reason}
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmModal({ count, onConfirm, onSkip, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full space-y-4">
        <h3 className="text-white font-bold">Manual Overrides Detected</h3>
        <p className="text-zinc-400 text-sm"><span className="text-amber-400 font-bold">{count} combo{count!==1?"s":""}</span> {count!==1?"have":"has"} been manually overridden. Re-validate and overwrite?</p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onConfirm} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold rounded-lg">Yes, overwrite all</button>
          <button onClick={onSkip}    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded-lg">Skip overrides, run rest</button>
          <button onClick={onCancel}  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm font-medium rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Lock modal ────────────────────────────────────────────────────────────
function LockModal({ validCount, invalidCount, manualValidCount, onConfirm, onCancel }) {
  const trackerCount=validCount+manualValidCount;
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔒</span>
          <h3 className="text-white font-bold text-lg">Lock Validation Results</h3>
        </div>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Once locked, the Tracker will only show <span className="text-emerald-400 font-bold">{trackerCount} valid combo{trackerCount!==1?"s":""}</span>.
          Invalid combos will be hidden (not deleted — you can unlock to see them again).
        </p>
        <div className="bg-zinc-800/60 rounded-lg p-3 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-zinc-400">✅ AI-validated valid</span><span className="text-emerald-400 font-bold">{validCount}</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">✏️ Manually overridden to valid</span><span className="text-amber-400 font-bold">{manualValidCount}</span></div>
          <div className="flex justify-between border-t border-zinc-700 pt-1.5 mt-1.5"><span className="text-white font-medium">Combos in Tracker</span><span className="text-white font-bold">{trackerCount}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Hidden (invalid)</span><span className="text-red-400">{invalidCount}</span></div>
        </div>
        <div className="flex gap-2">
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors">🔒 Lock Results</button>
          <button onClick={onCancel}  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-medium rounded-lg transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ValidateTab({ preHooks,hooks,transitions,leads,bodies,ctas,speakers,validationStore,setValidationStore,locked,setLocked,autoAddToTracker,setAutoAddToTracker,validationMode,setValidationMode,anthropicKey,setTab }) {
  const [scopeTagSet,setScopeTagSet]=useState(new Set());
  const [preHookMode,setPreHookMode]=useState("none");
  const [preHookTagSet,setPreHookTagSet]=useState(new Set()); // independent filter
  const [selectedPreHooks,setSelectedPreHooks]=useState(null);
  const [selectedHooks,setSelectedHooks]=useState(null);
  const [transitionMode,setTransitionMode]=useState("none");
  const [selectedTransitions,setSelectedTransitions]=useState(null);
  const [selectedLeads,setSelectedLeads]=useState(null);
  const [selectedBodies,setSelectedBodies]=useState(null);
  const [selectedCtas,setSelectedCtas]=useState(null);
  const [bodyMode,setBodyMode]=useState("none");
  const [ctaMode,setCtaMode]=useState("none");
  const [running,setRunning]=useState(false);
  const [paused,setPaused]=useState(false);
  const [progress,setProgress]=useState({done:0,total:0});
  const [pendingQueue,setPendingQueue]=useState([]);
  const [confirmModal,setConfirmModal]=useState(null);
  const [showLockModal,setShowLockModal]=useState(false);
  const pauseRef=useRef(false);
  const [resTagFilter,setResTagFilter]=useState("All");
  const [resSpeakerFilter,setResSpeakerFilter]=useState("All");
  const [resSearch,setResSearch]=useState("");
  const [validFilter,setValidFilter]=useState("All");
  const [sortBy,setSortBy]=useState("newest");
  const [selectedResultKeys,setSelectedResultKeys]=useState(new Set());

  // Pre-hooks use their OWN tag filter — independent of scopeTagSet
  // so an AI pre-hook can pair with Founder hooks etc.
  const visiblePreHooks  =useMemo(()=>preHooks.filter(ph=>tagMatch(ph.tag,preHookTagSet)),[preHooks,preHookTagSet]);
  const visibleHooks     =useMemo(()=>hooks.filter(h=>tagMatch(h.tag,scopeTagSet)),[hooks,scopeTagSet]);
  const visibleTransitions=useMemo(()=>transitions,[transitions]);
  const visibleLeads     =useMemo(()=>leads.filter(l=>tagMatch(l.tag,scopeTagSet)),[leads,scopeTagSet]);
  // When a tag scope is active, "Any" assets are included because they are explicitly compatible with all tags.
  // If you want strict Founder-only, tag your bodies/CTAs as Founder. "Any" means "works with everything".
  const visibleBodies  =useMemo(()=>bodies.filter(b=>scopeTagSet.size===0 ? true : tagMatch(b.tag,scopeTagSet)||b.tag==="Any"),[bodies,scopeTagSet]);
  const visibleCtas    =useMemo(()=>ctas.filter(c=>scopeTagSet.size===0 ? true : tagMatch(c.tag,scopeTagSet)||c.tag==="Any"),[ctas,scopeTagSet]);

  const preHooksToRun=useMemo(()=>{
    if(preHookMode==="none") return [null];
    if(preHookMode==="all")  return visiblePreHooks.length>0 ? visiblePreHooks : [null]; // fall back to skip if none in library
    const filtered=visiblePreHooks.filter(ph=>selectedPreHooks?.has(ph.id));
    return filtered.length>0 ? filtered : [null];
  },[preHookMode,visiblePreHooks,selectedPreHooks]);
  const transitionsToRun=useMemo(()=>{
    if(transitionMode==="none") return [null];
    if(transitionMode==="all")  return visibleTransitions.length>0 ? visibleTransitions : [null];
    const filtered=visibleTransitions.filter(t=>selectedTransitions?.has(t.id));
    return filtered.length>0 ? filtered : [null];
  },[transitionMode,visibleTransitions,selectedTransitions]);
  const hooksToRun =useMemo(()=>selectedHooks ?visibleHooks.filter(h=>selectedHooks.has(h.id)) :visibleHooks,[visibleHooks,selectedHooks]);
  const leadsToRun =useMemo(()=>selectedLeads ?visibleLeads.filter(l=>selectedLeads.has(l.id)) :visibleLeads,[visibleLeads,selectedLeads]);
  const bodiesToRun=useMemo(()=>{ if(bodyMode==="none") return [null]; if(bodyMode==="all") return visibleBodies; return selectedBodies?visibleBodies.filter(b=>selectedBodies.has(b.id)):visibleBodies; },[bodyMode,visibleBodies,selectedBodies]);
  const ctasToRun  =useMemo(()=>{ if(ctaMode==="none") return [null]; if(ctaMode==="all") return visibleCtas; return selectedCtas?visibleCtas.filter(c=>selectedCtas.has(c.id)):visibleCtas; },[ctaMode,visibleCtas,selectedCtas]);

  const toggle=(setter,getVisible)=>id=>setter(prev=>{ const s=prev?new Set(prev):new Set(getVisible().map(x=>x.id)); s.has(id)?s.delete(id):s.add(id); return s; });
  const isSelected=(sel,id)=>!sel||sel.has(id);
  const handleScopeTag=ts=>{setScopeTagSet(ts);setSelectedHooks(null);setSelectedLeads(null);setSelectedBodies(null);setSelectedCtas(null);};

  const allTasks=useMemo(()=>{
    const tasks=[];
    for(const ph of preHooksToRun) for(const h of hooksToRun) for(const l of leadsToRun) for(const t of transitionsToRun) for(const b of bodiesToRun) for(const c of ctasToRun){
      const key=`${ph?.id||"none"}+${h.id}+${l.id}+${t?.id||"none"}+${b?.id||"none"}+${c?.id||"none"}`;
      tasks.push({ph,h,t,l,b,c,key});
    }
    return tasks;
  },[preHooksToRun,hooksToRun,transitionsToRun,leadsToRun,bodiesToRun,ctasToRun]);

  const newTasks=useMemo(()=>allTasks.filter(t=>!(t.key in validationStore)),[allTasks,validationStore]);
  const alreadyDone=allTasks.length-newTasks.length;

  const executeRun=async(tasks)=>{
    setRunning(true);setPaused(false);pauseRef.current=false;
    setProgress({done:0,total:tasks.length});
    for(let i=0;i<tasks.length;i++){
      if(pauseRef.current){ setPendingQueue(tasks.slice(i)); setPaused(true); setRunning(false); return; }
      const {ph,h,t,l,b,c,key}=tasks[i];
      const baseEntry={key,preHookId:ph?.id||null,hookId:h.id,transitionId:t?.id||null,leadId:l.id,bodyId:b?.id||null,ctaId:c?.id||null,hookTag:h.tag,leadTag:l.tag,mode:validationMode};
      try {
        const res=await callValidate(h,l,t,b,c,validationMode,anthropicKey);
        setValidationStore(prev=>({...prev,[key]:{...baseEntry,valid:res.valid,reason:res.reason,manual:false,validatedAt:new Date().toISOString()}}));
      } catch(err) {
        setValidationStore(prev=>({...prev,[key]:{...baseEntry,valid:null,reason:`Error: ${err?.message||"Unknown error"}`,manual:false}}));
      }
      setProgress({done:i+1,total:tasks.length});
    }
    setPendingQueue([]);setRunning(false);
  };

  const handleRunClick=()=>{
    const manualKeys=new Set(allTasks.filter(t=>(t.key in validationStore)&&validationStore[t.key].manual).map(t=>t.key));
    if(manualKeys.size>0){ setConfirmModal({tasks:newTasks,manualKeys}); } else { executeRun(newTasks); }
  };
  const errorTasks=useMemo(()=>allTasks.filter(t=>(t.key in validationStore)&&validationStore[t.key].valid===null&&!validationStore[t.key].manual),[allTasks,validationStore]);
  const handleRetryErrors=()=>{ if(errorTasks.length>0) executeRun(errorTasks); };
  // Re-run all combos in current scope, replacing their stored results (leaves unrelated store entries alone)
  const handleRerunScope=()=>{
    setValidationStore(prev=>{ const next={...prev}; allTasks.forEach(t=>delete next[t.key]); return next; });
    setTimeout(()=>executeRun(allTasks),50);
  };
  const handleConfirmOverwrite=()=>{
    const manualTasks=Object.keys(validationStore).filter(k=>confirmModal.manualKeys.has(k)).map(k=>{
      const v=validationStore[k];
      return {ph:preHooks.find(x=>x.id===v.preHookId)||null,h:hooks.find(x=>x.id===v.hookId),t:transitions.find(x=>x.id===v.transitionId)||null,l:leads.find(x=>x.id===v.leadId),b:bodies.find(x=>x.id===v.bodyId)||null,c:ctas.find(x=>x.id===v.ctaId)||null,key:k};
    });
    setConfirmModal(null); executeRun([...confirmModal.tasks,...manualTasks]);
  };

  const handleOverride=(key, newValid)=>{
    setValidationStore(prev=>{
      const existing=prev[key]; if(!existing) return prev;
      const alreadyCorrect=existing.valid===newValid; if(alreadyCorrect) return prev;
      return {...prev,[key]:{...existing,valid:newValid,manual:true,reviewed:true,
        addedToTrackerAt: newValid ? (existing.addedToTrackerAt||new Date().toISOString()) : null,
        reason:existing.manual?existing.reason:`Original AI verdict: "${existing.reason}" — manually overridden.`}};
    });
    if (newValid && validFilter==="Invalid") setValidFilter("All");
  };

  const handleMarkReviewed=(key)=>{
    setValidationStore(prev=>{
      const existing=prev[key]; if(!existing) return prev;
      return {...prev,[key]:{...existing,reviewed:!existing.reviewed}};
    });
  };

  // Only count results that belong to the current scope (allTasks), not stale results from previous runs
  const scopeKeys=useMemo(()=>new Set(allTasks.map(t=>t.key)),[allTasks]);
  // For display: show ALL stored results whose hook+lead exist in the current asset library
  // (scope selection controls Run button only — results persist across tab switches and refreshes)
  const hookIdSet=useMemo(()=>new Set(hooks.map(h=>h.id)),[hooks]);
  const leadIdSet=useMemo(()=>new Set(leads.map(l=>l.id)),[leads]);
  const results=useMemo(()=>
    Object.values(validationStore).filter(r=>hookIdSet.has(r.hookId)&&leadIdSet.has(r.leadId))
  ,[validationStore,hookIdSet,leadIdSet]);
  const allResults=Object.values(validationStore); // used for the results list display
  const aiValidCount    =results.filter(r=>r.valid===true&&!r.manual&&!r.archived).length;
  const inTrackerCount  =results.filter(r=>r.valid===true&&r.manual).length;
  const manualValidCount=inTrackerCount;
  const invalidCount    =results.filter(r=>r.valid===false&&!r.archived).length;
  const archivedCount   =results.filter(r=>!!r.archived).length;
  const manualCount     =results.filter(r=>r.manual).length;
  const remainingCount  =aiValidCount; // valid AI results not yet moved to tracker

  const hookMap=useMemo(()=>Object.fromEntries(hooks.map(h=>[h.id,h.text])),[hooks]);
  const leadMap=useMemo(()=>Object.fromEntries(leads.map(l=>[l.id,l.text])),[leads]);
  const bodyMap=useMemo(()=>Object.fromEntries(bodies.map(b=>[b.id,b.text])),[bodies]);
  const ctaMap =useMemo(()=>Object.fromEntries(ctas.map(c=>[c.id,c.text])),[ctas]);

  // Build speaker options from hooks/leads referenced in results
  const hookSpeakerMap=useMemo(()=>Object.fromEntries(hooks.map(h=>[h.id,h.speaker||""])),[hooks]);
  const leadSpeakerMap=useMemo(()=>Object.fromEntries(leads.map(l=>[l.id,l.speaker||""])),[leads]);
  const speakerOptions=useMemo(()=>{
    const set=new Set();
    results.forEach(r=>{
      if(hookSpeakerMap[r.hookId]) set.add(hookSpeakerMap[r.hookId]);
      if(leadSpeakerMap[r.leadId]) set.add(leadSpeakerMap[r.leadId]);
    });
    // also include roster speakers
    (speakers||[]).forEach(s=>{ if(s.name) set.add(s.name); });
    return [...set].sort();
  },[results,hookSpeakerMap,leadSpeakerMap,speakers]);

  const filteredResults=results.filter(r=>{
    const matchTag=resTagFilter==="All"||r.hookTag===resTagFilter||r.leadTag===resTagFilter;
    const hSpk=hookSpeakerMap[r.hookId]||"";
    const lSpk=leadSpeakerMap[r.leadId]||"";
    const matchSpeaker=resSpeakerFilter==="All"||hSpk===resSpeakerFilter||lSpk===resSpeakerFilter;
    const matchSearch=resSearch===""||r.hookId.toLowerCase().includes(resSearch.toLowerCase())||r.leadId.toLowerCase().includes(resSearch.toLowerCase());
    const inTracker=r.manual&&r.valid;
    const isArchived=!!r.archived;
    let matchValid=false;
    if(validFilter==="All")         matchValid=!isArchived;
    else if(validFilter==="Valid")   matchValid=r.valid===true&&!inTracker&&!isArchived;
    else if(validFilter==="Invalid") matchValid=r.valid===false&&!isArchived;
    else if(validFilter==="InTracker") matchValid=inTracker;
    else if(validFilter==="Archived")  matchValid=isArchived;
    else if(validFilter==="Unreviewed") matchValid=!r.reviewed&&!inTracker&&!isArchived;
    return matchTag&&matchSpeaker&&matchSearch&&matchValid;
  }).sort((a,b)=>{
    const ts = r => sortBy.includes("tracker") ? (r.addedToTrackerAt||"") : (r.validatedAt||"");
    return sortBy==="oldest"||sortBy==="tracker-oldest" ? ts(a).localeCompare(ts(b)) : ts(b).localeCompare(ts(a));
  });

  const totalCombos=allTasks.length;

  return (
    <div>
      {confirmModal&&<ConfirmModal count={confirmModal.manualKeys.size} onConfirm={handleConfirmOverwrite} onSkip={()=>{setConfirmModal(null);executeRun(confirmModal.tasks);}} onCancel={()=>setConfirmModal(null)}/>}
      {showLockModal&&(
        <LockModal validCount={aiValidCount} invalidCount={invalidCount} manualValidCount={manualValidCount}
          onConfirm={()=>{setLocked(true);setShowLockModal(false);}}
          onCancel={()=>setShowLockModal(false)}/>
      )}

      {/* Lock/Unlock banner */}
      {locked&&(
        <div className="mb-5 flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <span className="text-xl">🔒</span>
          <div className="flex-1">
            <div className="text-amber-400 font-bold text-sm">Results Locked</div>
            <div className="text-zinc-400 text-xs">The Tracker is showing only valid combos. Unlock to re-validate or review all results.</div>
          </div>
          <button onClick={()=>setLocked(false)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-700 transition-colors">
            🔓 Unlock
          </button>
        </div>
      )}

      <div className="max-w-3xl mb-6 p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-white font-bold mb-1">Bulk AI Validation</h3>
            <p className="text-zinc-400 text-sm">New combos added later are picked up automatically — existing results are never overwritten.</p>
          </div>
        </div>

        {/* Validation mode selector */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Validation mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={()=>setValidationMode("grammar")}
              className={`p-3 rounded-xl border text-left transition-all ${validationMode==="grammar"?"bg-sky-500/10 border-sky-500/40":"bg-zinc-800/60 border-zinc-700/50 hover:border-zinc-600"}`}>
              <div className={`text-sm font-bold mb-1 ${validationMode==="grammar"?"text-sky-400":"text-zinc-300"}`}>Grammar / Flow</div>
              <div className="text-xs text-zinc-500 leading-snug">Checks that segments read naturally back-to-back. No awkward handoffs or tonal clashes.</div>
            </button>
            <button onClick={()=>setValidationMode("deep")}
              className={`p-3 rounded-xl border text-left transition-all ${validationMode==="deep"?"bg-violet-500/10 border-violet-500/40":"bg-zinc-800/60 border-zinc-700/50 hover:border-zinc-600"}`}>
              <div className={`text-sm font-bold mb-1 ${validationMode==="deep"?"text-violet-400":"text-zinc-300"}`}>Deep Validation</div>
              <div className="text-xs text-zinc-500 leading-snug">Checks narrative coherence: does the body deliver on the hook's promise? Does the CTA match the energy?</div>
            </button>
          </div>
        </div>

        {/* Tag filter for Hooks / Leads / Bodies / CTAs */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Filter by type <span className="text-zinc-600 font-normal normal-case">(Hooks · Leads · Bodies · CTAs)</span></label>
          <TagFilterRow tagSet={scopeTagSet} onChange={handleScopeTag}/>
          {scopeTagSet.size>0&&<p className="text-xs text-amber-400">Showing {[...scopeTagSet].join(" + ")} assets only.</p>}
        </div>

        {/* Pre-hooks — independent tag filter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Pre-hooks {preHookMode!=="none"&&<span className="text-rose-400 font-bold ml-1 normal-case">{preHooksToRun.length} selected</span>}</label>
              <p className="text-xs text-zinc-600 mt-0.5">Independent tag filter — an AI pre-hook can pair with any Founder or UGC hook.</p>
            </div>
            {preHookMode==="pick"&&<button onClick={()=>setSelectedPreHooks(null)} className="text-xs text-zinc-500 hover:text-zinc-300 shrink-0">Select all</button>}
          </div>
          <div className="flex gap-2 flex-wrap">
            {[{val:"none",label:"Skip"},{val:"all",label:"All pre-hooks"},{val:"pick",label:"Pick specific"}].map(opt=>(
              <button key={opt.val} onClick={()=>setPreHookMode(opt.val)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${preHookMode===opt.val?"bg-amber-500 text-black border-amber-500":"bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"}`}>
                {opt.label}
              </button>
            ))}
          </div>
          {preHookMode!=="none"&&(
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-600">Filter pre-hooks by tag:</span>
                <TagFilterRow tagSet={preHookTagSet} onChange={setPreHookTagSet}/>
              </div>
              {preHookMode==="pick"&&<div className="flex flex-wrap gap-2 pt-1">
                {visiblePreHooks.length===0?<span className="text-zinc-600 text-xs">No pre-hooks match.</span>
                  :visiblePreHooks.map(ph=><AssetChip key={ph.id} item={ph} selected={isSelected(selectedPreHooks,ph.id)} onToggle={toggle(setSelectedPreHooks,()=>visiblePreHooks)}/>)}
              </div>}
            </div>
          )}
        </div>

        {/* Hooks */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Hooks <span className="text-amber-400 font-bold ml-1 normal-case">{hooksToRun.length} selected</span></label>
            <button onClick={()=>setSelectedHooks(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Select all</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleHooks.length===0?<span className="text-zinc-600 text-xs">No hooks match.</span>
              :visibleHooks.map(h=><AssetChip key={h.id} item={h} selected={isSelected(selectedHooks,h.id)} onToggle={toggle(setSelectedHooks,()=>visibleHooks)}/>)}
          </div>
        </div>

        {/* Leads */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Leads <span className="text-sky-400 font-bold ml-1 normal-case">{leadsToRun.length} selected</span></label>
            <button onClick={()=>setSelectedLeads(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Select all</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleLeads.length===0?<span className="text-zinc-600 text-xs">No leads match.</span>
              :visibleLeads.map(l=><AssetChip key={l.id} item={l} selected={isSelected(selectedLeads,l.id)} onToggle={toggle(setSelectedLeads,()=>visibleLeads)}/>)}
          </div>
        </div>

        {/* Transitions */}
        {visibleTransitions.length>0&&(
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Transitions {transitionMode!=="none"&&<span className="text-teal-400 font-bold ml-1 normal-case">{transitionsToRun.length} selected</span>}</label>
              {transitionMode==="pick"&&<button onClick={()=>setSelectedTransitions(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Select all</button>}
            </div>
            <div className="flex gap-2 flex-wrap">
              {[{val:"none",label:"Skip"},{val:"all",label:"All transitions"},{val:"pick",label:"Pick specific"}].map(opt=>(
                <button key={opt.val} onClick={()=>setTransitionMode(opt.val)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${transitionMode===opt.val?"bg-amber-500 text-black border-amber-500":"bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {transitionMode!=="none"&&<p className="text-xs text-zinc-600">Universal transitions auto-approve. Selective ones are validated by AI.</p>}
            {transitionMode==="pick"&&<div className="flex flex-wrap gap-2 pt-1">
              {visibleTransitions.map(t=>(
                <button key={t.id} onClick={()=>toggle(setSelectedTransitions,()=>visibleTransitions)(t.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors
                    ${isSelected(selectedTransitions,t.id)?"bg-teal-500/20 border-teal-500/40 text-teal-300":"bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"}`}>
                  <span>{t.id}</span>
                  <span className={`text-xs px-1 py-0.5 rounded ${t.universal?"bg-teal-500/20 text-teal-400":"bg-zinc-700 text-zinc-500"}`}>{t.universal?"U":"S"}</span>
                </button>
              ))}
            </div>}
          </div>
        )}

        {/* Bodies */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Bodies {bodyMode!=="none"&&<span className="text-purple-400 font-bold ml-1 normal-case">{bodiesToRun.length} selected</span>}</label>
            {bodyMode==="pick"&&<button onClick={()=>setSelectedBodies(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Select all</button>}
          </div>
          <div className="flex gap-2 flex-wrap">
            {[{val:"none",label:"Skip"},{val:"all",label:"All bodies"},{val:"pick",label:"Pick specific"}].map(opt=>(
              <button key={opt.val} onClick={()=>setBodyMode(opt.val)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${bodyMode===opt.val?"bg-amber-500 text-black border-amber-500":"bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"}`}>
                {opt.label}
              </button>
            ))}
          </div>
          {bodyMode==="pick"&&<div className="flex flex-wrap gap-2 pt-1">
            {visibleBodies.length===0?<span className="text-zinc-600 text-xs">No bodies match.</span>
              :visibleBodies.map(b=><AssetChip key={b.id} item={b} selected={isSelected(selectedBodies,b.id)} onToggle={toggle(setSelectedBodies,()=>visibleBodies)}/>)}
          </div>}
        </div>

        {/* CTAs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">CTAs {ctaMode!=="none"&&<span className="text-pink-400 font-bold ml-1 normal-case">{ctasToRun.length} selected</span>}</label>
            {ctaMode==="pick"&&<button onClick={()=>setSelectedCtas(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Select all</button>}
          </div>
          <div className="flex gap-2 flex-wrap">
            {[{val:"none",label:"Skip"},{val:"all",label:"All CTAs"},{val:"pick",label:"Pick specific"}].map(opt=>(
              <button key={opt.val} onClick={()=>setCtaMode(opt.val)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${ctaMode===opt.val?"bg-amber-500 text-black border-amber-500":"bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"}`}>
                {opt.label}
              </button>
            ))}
          </div>
          {ctaMode==="pick"&&<div className="flex flex-wrap gap-2 pt-1">
            {visibleCtas.length===0?<span className="text-zinc-600 text-xs">No CTAs match.</span>
              :visibleCtas.map(c=><AssetChip key={c.id} item={c} selected={isSelected(selectedCtas,c.id)} onToggle={toggle(setSelectedCtas,()=>visibleCtas)}/>)}
          </div>}
        </div>

        {/* Summary + Run */}
        <div className="pt-1 border-t border-zinc-800 space-y-3">
          <div className="space-y-1">
            <div className="text-sm text-zinc-400">
              Scope:{preHookMode!=="none"&&<>{" "}<span className="text-rose-400 font-bold">{preHooksToRun.length}PH</span>{" × "}</>}
              {preHookMode==="none"&&" "}
              <span className="text-amber-400 font-bold">{hooksToRun.length}H</span>{" × "}
              <span className="text-sky-400 font-bold">{leadsToRun.length}L</span>
              {transitionMode!=="none"&&<>{" × "}<span className="text-teal-400 font-bold">{transitionsToRun.length}T</span></>}
              {bodyMode!=="none"&&<>{" × "}<span className="text-purple-400 font-bold">{bodiesToRun.length}B</span></>}
              {ctaMode!=="none"&&<>{" × "}<span className="text-pink-400 font-bold">{ctasToRun.length}CTA</span></>}
              {" = "}<span className="text-white font-bold">{totalCombos} combos</span>
            </div>
            {preHookMode!=="none"&&visiblePreHooks.length===0&&<div className="text-xs text-orange-400">⚠ Pre-hooks set to "All" but none exist in library — treating as Skip.</div>}
            {transitionMode!=="none"&&transitionMode!=="none"&&visibleTransitions.length===0&&<div className="text-xs text-orange-400">⚠ Transitions set to "All" but none exist in library — treating as Skip.</div>}
            {alreadyDone>0&&<div className="text-xs text-zinc-500">
              <span className="text-emerald-400 font-bold">{alreadyDone} already validated</span> · <span className="text-amber-400 font-bold">{newTasks.length} new to check</span>
            </div>}
            {paused&&pendingQueue.length>0&&<div className="text-xs text-amber-400 font-medium">⏸ Paused — {pendingQueue.length} combos remaining</div>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!anthropicKey&&(
              <div className="w-full bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 flex items-center justify-between">
                <span className="text-red-400 text-sm">No Anthropic API key set — validation won't work.</span>
                <span className="text-zinc-500 text-xs">Add it in ⚙ Settings</span>
              </div>
            )}
            {!paused?(
              <button onClick={handleRunClick} disabled={running||newTasks.length===0}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-lg text-sm flex items-center gap-2">
                {running?<><span className="inline-block animate-spin">⟳</span> Running {progress.done}/{progress.total}...</>
                  :`▶ Run${newTasks.length<totalCombos?" New":""} (${newTasks.length} combo${newTasks.length!==1?"s":""})`}
              </button>
            ):(
              <button onClick={()=>{ if(pendingQueue.length>0) executeRun(pendingQueue); }} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg text-sm">
                ▶ Resume ({pendingQueue.length} remaining)
              </button>
            )}
            {!running&&!paused&&allTasks.length>0&&alreadyDone>0&&(
              <button onClick={handleRerunScope} disabled={running}
                className="px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 text-white font-medium rounded-lg text-sm">
                ↺ Re-run Scope ({allTasks.length})
              </button>
            )}
            {Object.keys(validationStore).length>0&&!running&&!locked&&(
              <button onClick={()=>setShowLockModal(true)}
                className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold rounded-lg text-sm">
                🔒 Lock Results
              </button>
            )}
            {running&&<button onClick={()=>{pauseRef.current=true;}} className="px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-lg text-sm">⏸ Pause</button>}
            {errorTasks.length>0&&!running&&(
              <button onClick={handleRetryErrors}
                className="px-4 py-2.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 font-bold rounded-lg text-sm flex items-center gap-1.5">
                ⟳ Retry {errorTasks.length} error{errorTasks.length!==1?"s":""}
              </button>
            )}
            {results.length>0&&!running&&(
              <div className="flex gap-2 text-sm flex-wrap items-center">
                <span className="text-emerald-400 font-bold">✅ {aiValidCount+inTrackerCount} valid</span>
                {inTrackerCount>0&&<><span className="text-zinc-600">·</span><span className="text-amber-400 font-bold">➡ {inTrackerCount} in Tracker</span></>}
                {inTrackerCount>0&&<><span className="text-zinc-600">·</span><span className="text-zinc-400">{remainingCount} remaining</span></>}
                <span className="text-zinc-600">·</span>
                <span className="text-red-400 font-bold">❌ {invalidCount}</span>
                {errorTasks.length>0&&<><span className="text-zinc-600">·</span><span className="text-orange-400 font-bold">⚠️ {errorTasks.length} errors</span></>}
                {archivedCount>0&&<><span className="text-zinc-600">·</span><span className="text-zinc-500">📦 {archivedCount} archived</span></>}
              </div>
            )}
          </div>
          {running&&(
            <div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{width:`${progress.total?(progress.done/progress.total)*100:0}%`}}/>
              </div>
              <p className="text-zinc-500 text-xs mt-1.5">Checking combo {progress.done} of {progress.total}…</p>
            </div>
          )}

          {/* Auto-add toggle + Lock button */}
          {Object.keys(validationStore).length>0&&!running&&(
            <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2">
              {/* Auto-add toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none group">
                <div onClick={()=>setAutoAddToTracker(v=>!v)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${autoAddToTracker?"bg-amber-500":"bg-zinc-700"}`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${autoAddToTracker?"translate-x-5":""}`}/>
                </div>
                <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                  Auto-add AI-validated results to Tracker
                  {autoAddToTracker
                    ? <span className="ml-1 text-amber-400">(ON — all ✅ AI results appear in Tracker)</span>
                    : <span className="ml-1 text-zinc-600">(OFF — only manually approved results appear)</span>
                  }
                </span>
              </label>
              {!locked&&(
                <button onClick={()=>setShowLockModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-amber-500/40 text-zinc-300 hover:text-white text-sm font-medium rounded-lg transition-all w-fit">
                  🔒 Lock Results & Update Tracker
                </button>
              )}
              {!locked&&<p className="text-zinc-600 text-xs">Locking hides invalid combos from the Tracker. You can unlock anytime.</p>}
            </div>
          )}
        </div>
      </div>

      {/* Results list */}
      {results.length>0&&(
        <div>
          {/* Results toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input value={resSearch} onChange={e=>setResSearch(e.target.value)} placeholder="Search by Hook or Lead ID..."
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 w-44"/>
            {/* Tag dropdown */}
            <select value={resTagFilter} onChange={e=>setResTagFilter(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500 cursor-pointer">
              <option value="All">All Tags</option>
              {["Founder","UGC","AI","VO","Any"].map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            {/* Speaker dropdown — strongest filter, only shows speakers present in results */}
            <select value={resSpeakerFilter} onChange={e=>setResSpeakerFilter(e.target.value)}
              className={`border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none cursor-pointer transition-colors
                ${resSpeakerFilter!=="All"
                  ?"bg-teal-500/15 border-teal-500/40 text-teal-300 focus:border-teal-400"
                  :"bg-zinc-800 border-zinc-700 text-zinc-300 focus:border-amber-500"}`}>
              <option value="All">All Speakers</option>
              {speakerOptions.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            {/* Verdict filter pills */}
            <div className="flex gap-1 ml-auto flex-wrap">
              {[
                {id:"All",       label:"All"},
                {id:"Valid",     label:"✅ Valid"},
                {id:"Invalid",   label:"❌ Invalid"},
                {id:"InTracker", label:"➡ In Tracker"},
                {id:"Unreviewed",label:"👁 Unreviewed"},
                {id:"Archived",  label:"📦 Archived"},
              ].map(({id,label})=>(
                <button key={id} onClick={()=>setValidFilter(id)}
                  className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors
                    ${validFilter===id
                      ?id==="Valid"?"bg-emerald-500 text-black":id==="Invalid"?"bg-red-500 text-white":id==="InTracker"?"bg-amber-500 text-black":id==="Unreviewed"?"bg-teal-500 text-black":id==="Archived"?"bg-zinc-500 text-white":"bg-zinc-600 text-white"
                      :"bg-zinc-800 text-zinc-400 hover:text-white"}`}>
                  {label}
                </button>
              ))}
            </div>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-amber-500 ml-auto shrink-0">
              <option value="newest">📅 Validated: Newest</option>
              <option value="oldest">📅 Validated: Oldest</option>
              <option value="tracker-newest">🗂 Tracker: Newest</option>
              <option value="tracker-oldest">🗂 Tracker: Oldest</option>
            </select>
          </div>
          {/* Count + select-all + clear/restart row */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {/* Select all checkbox */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox"
                checked={filteredResults.length>0&&filteredResults.every(r=>selectedResultKeys.has(r.key))}
                ref={el=>{ if(el) el.indeterminate=filteredResults.some(r=>selectedResultKeys.has(r.key))&&!filteredResults.every(r=>selectedResultKeys.has(r.key)); }}
                onChange={e=>{
                  if(e.target.checked) setSelectedResultKeys(prev=>new Set([...prev,...filteredResults.map(r=>r.key)]));
                  else setSelectedResultKeys(prev=>{ const n=new Set(prev); filteredResults.forEach(r=>n.delete(r.key)); return n; });
                }}
                className="accent-amber-500 w-3.5 h-3.5 cursor-pointer"/>
              <span className="text-xs text-zinc-500">
                {selectedResultKeys.size>0?`${selectedResultKeys.size} selected`:`${filteredResults.length} results`}
              </span>
            </label>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={()=>{ const invalids=Object.keys(validationStore).filter(k=>validationStore[k].valid===false); setValidationStore(prev=>{ const next={...prev}; invalids.forEach(k=>delete next[k]); return next; }); setLocked(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-red-500/40 text-zinc-400 hover:text-red-400 text-xs font-medium rounded-lg transition-all">
                🗑 Clear Invalids
              </button>
              <button
                onClick={()=>{ if(!window.confirm("Clear ALL validation results and start over?")) return; setValidationStore({}); setLocked(false); setPaused(false); setPendingQueue([]); setProgress({done:0,total:0}); setSelectedResultKeys(new Set()); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-amber-500/40 text-zinc-400 hover:text-amber-400 text-xs font-medium rounded-lg transition-all">
                ↺ Restart Validation
              </button>
            </div>
          </div>

          {/* Floating bulk action bar */}
          {selectedResultKeys.size>0&&(
            <div className="sticky top-2 z-30 mb-3 flex items-center gap-2 flex-wrap p-2.5 bg-zinc-900 border border-amber-500/40 rounded-xl shadow-xl shadow-black/40">
              <span className="text-amber-400 text-xs font-bold">{selectedResultKeys.size} selected</span>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={()=>{ setValidationStore(prev=>{ const n={...prev}; selectedResultKeys.forEach(k=>{ if(n[k]) n[k]={...n[k],valid:true,manual:true,reviewed:true, reason:n[k].manual?n[k].reason:`Original AI verdict: "${n[k].reason}" — manually overridden.`}; }); return n; }); setSelectedResultKeys(new Set()); }}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-xs font-semibold rounded-lg transition-colors">
                  ✅ Mark Valid
                </button>
                <button
                  onClick={()=>{ setValidationStore(prev=>{ const n={...prev}; selectedResultKeys.forEach(k=>{ if(n[k]) n[k]={...n[k],valid:false,manual:true,reviewed:true, reason:n[k].manual?n[k].reason:`Original AI verdict: "${n[k].reason}" — manually overridden.`}; }); return n; }); setSelectedResultKeys(new Set()); }}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs font-semibold rounded-lg transition-colors">
                  ❌ Mark Invalid
                </button>
                {validFilter!=="Archived"&&(
                  <button
                    onClick={()=>{ setValidationStore(prev=>{ const n={...prev}; selectedResultKeys.forEach(k=>{ if(n[k]) n[k]={...n[k],archived:true,reviewed:true}; }); return n; }); setSelectedResultKeys(new Set()); }}
                    className="px-3 py-1.5 bg-zinc-700/60 hover:bg-zinc-600/60 border border-zinc-600 text-zinc-400 hover:text-zinc-300 text-xs font-semibold rounded-lg transition-colors"
                    title="Hide from view — still stored so these combos won't be re-matched">
                    📦 Archive
                  </button>
                )}
                {validFilter==="Archived"&&(
                  <button
                    onClick={()=>{ setValidationStore(prev=>{ const n={...prev}; selectedResultKeys.forEach(k=>{ if(n[k]){ const u={...n[k]}; delete u.archived; n[k]=u; } }); return n; }); setSelectedResultKeys(new Set()); }}
                    className="px-3 py-1.5 bg-zinc-700/60 hover:bg-zinc-600/60 border border-zinc-600 text-zinc-300 text-xs font-semibold rounded-lg transition-colors">
                    ↩ Unarchive
                  </button>
                )}
                <button
                  onClick={()=>{ setValidationStore(prev=>{ const n={...prev}; selectedResultKeys.forEach(k=>{ if(n[k]) n[k]={...n[k],reviewed:true}; }); return n; }); setSelectedResultKeys(new Set()); }}
                  className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-400 text-xs font-semibold rounded-lg transition-colors">
                  ✓ Mark Reviewed
                </button>
                <button
                  onClick={()=>{ if(!window.confirm(`Delete ${selectedResultKeys.size} result${selectedResultKeys.size!==1?"s":""}? These combos will be re-validated on the next run.`)) return; setValidationStore(prev=>{ const n={...prev}; selectedResultKeys.forEach(k=>delete n[k]); return n; }); setSelectedResultKeys(new Set()); }}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-red-500/20 border border-zinc-700 hover:border-red-500/40 text-zinc-400 hover:text-red-400 text-xs font-semibold rounded-lg transition-colors">
                  🗑 Delete
                </button>
                <button
                  onClick={()=>{ setValidationStore(prev=>{ const n={...prev}; selectedResultKeys.forEach(k=>{ if(n[k]) n[k]={...n[k],valid:true,manual:true,reviewed:true,reason:n[k].manual?n[k].reason:`Original AI verdict: "${n[k].reason}" — manually approved & moved to tracker.`}; }); return n; }); setSelectedResultKeys(new Set()); }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 border border-amber-500 text-black text-xs font-bold rounded-lg transition-colors">
                  ➡ Move to Tracker
                </button>
              </div>
              <button onClick={()=>setSelectedResultKeys(new Set())}
                className="ml-auto text-zinc-500 hover:text-white text-xs px-2 py-1 rounded transition-colors">
                ✕ Clear
              </button>
            </div>
          )}

          <div className="space-y-2">
            {filteredResults.map((r,i)=>(
              <ResultCard key={r.key||i} result={r} rowNum={i+1}
                selected={selectedResultKeys.has(r.key)}
                onSelect={checked=>setSelectedResultKeys(prev=>{ const n=new Set(prev); checked?n.add(r.key):n.delete(r.key); return n; })}
                hookText={hookMap[r.hookId]} leadText={leadMap[r.leadId]}
                bodyText={r.bodyId?bodyMap[r.bodyId]:null} ctaText={r.ctaId?ctaMap[r.ctaId]:null}
                onOverride={handleOverride} onMarkReviewed={handleMarkReviewed} validationMode={r.mode||validationMode}/>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CopyMini({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { copyText(text); setCopied(true); setTimeout(()=>setCopied(false), 1500); };
  return (
    <button onClick={copy}
      className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-medium transition-all duration-150
        ${copied?"bg-emerald-500 text-black":"bg-zinc-700/60 text-zinc-400 hover:bg-amber-500 hover:text-black"}`}>
      {copied ? "✓" : "Copy"}
    </button>
  );
}

function FilenameField({ value, onChange }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    copyText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-0 rounded-lg overflow-hidden border border-zinc-700/60 bg-zinc-900/60 shrink-0">
      <span className="pl-2 text-zinc-600 text-xs select-none">📄</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-transparent px-2 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none w-52 min-w-0"
      />
      <button
        onClick={copy}
        className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border-l transition-all duration-150
          ${copied
            ? "bg-emerald-500 border-emerald-500 text-black"
            : "border-zinc-700/60 text-zinc-400 hover:bg-amber-500 hover:border-amber-500 hover:text-black"}`}>
        {copied ? "✓ Copied" : "Copy"}
      </button>
    </div>
  );
}

function ComboRow({ combo, vr, assetMap, onToggle, onSetVideoStatus, onUrlChange, onFilenameChange, sheetsUrl, syncStatus, onSync, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const vs = combo.videoStatus;
  const borderCls = selected ? "border-teal-500/50" : vs==="approved" ? "border-emerald-500/30" : vs==="rejected" ? "border-red-500/25" : vs==="stitched" ? "border-amber-500/25" : vr?.valid===false ? "border-red-500/15" : "border-zinc-700/40";
  const bgCls     = selected ? "bg-teal-500/8"      : vs==="approved" ? "bg-emerald-500/6"      : vs==="rejected" ? "bg-red-500/6"      : vs==="stitched" ? "bg-amber-500/5"      : vr?.valid===false ? "bg-red-500/5"      : "bg-zinc-800/40";

  const assetSlots = [
    ...(combo.preHookId ? [{id:combo.preHookId,label:"Pre-hook",idColor:"text-rose-400",  border:"border-rose-500/20",   bg:"bg-rose-500/5"  }] : []),
    {id:combo.hookId,     label:"Hook",     idColor:"text-amber-400",  border:"border-amber-500/20",  bg:"bg-amber-500/5"  },
    {id:combo.leadId,     label:"Lead",     idColor:"text-sky-400",    border:"border-sky-500/20",    bg:"bg-sky-500/5"    },
    {id:combo.bodyId,     label:"Body",     idColor:"text-purple-400", border:"border-purple-500/20", bg:"bg-purple-500/5" },
    {id:combo.ctaId,      label:"CTA",      idColor:"text-pink-400",   border:"border-pink-500/20",   bg:"bg-pink-500/5"   },
  ];
  const attachedCount = assetSlots.filter(s => { const a=assetMap[s.id]; return a?.driveUrl||a?.videoFileName; }).length;
  const totalSlots = assetSlots.length;

  return (
    <div className={`rounded-lg border transition-all ${bgCls} ${borderCls}`}>
      {/* ── Main row ── */}
      <div className="flex items-center gap-3 p-3 flex-wrap">
        {onSelect&&<input type="checkbox" checked={!!selected} onChange={e=>onSelect(e.target.checked)}
          onClick={e=>e.stopPropagation()}
          className="accent-teal-500 w-3.5 h-3.5 shrink-0 cursor-pointer" title="Select for Stitcher"/>}
        {/* Video status */}
        {!vs&&<span className="shrink-0 text-xs text-zinc-600 px-2 py-0.5 rounded-full border border-zinc-700/50">⬜ Not stitched</span>}
        {vs==="stitched"&&<div className="shrink-0 flex items-center gap-1">
          <span className="text-xs text-amber-400 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">🎬 Stitched</span>
          <button onClick={()=>onSetVideoStatus(combo.key,"approved")} className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 font-semibold transition-all">✅ Approve</button>
          <button onClick={()=>onSetVideoStatus(combo.key,"rejected")} className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 font-semibold transition-all">❌ Unusable</button>
        </div>}
        {vs==="approved"&&<button onClick={()=>onSetVideoStatus(combo.key,"stitched")} title="Click to reset status" className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 font-semibold transition-all">✅ Approved</button>}
        {vs==="rejected"&&<button onClick={()=>onSetVideoStatus(combo.key,"stitched")} title="Click to reset status" className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/10 font-semibold transition-all">❌ Unusable</button>}
        {vr&&<span className="text-sm shrink-0">{vr.manual?"✏️":vr.valid?"✅":"❌"}</span>}
        <div className="flex items-center gap-1 shrink-0 flex-wrap">
          {combo.preHookId&&<>
            <span className="font-mono text-rose-400 text-xs font-bold">{combo.preHookId}</span>
            <span className="text-zinc-600 text-xs">+</span>
          </>}
          <span className="font-mono text-amber-400 text-xs font-bold">{combo.hookId}</span>
          {combo.hookDescriptor&&<span className="text-zinc-600 text-xs italic">({combo.hookDescriptor})</span>}
          <span className="text-zinc-600 text-xs">+</span>
          <span className="font-mono text-sky-400 text-xs font-bold">{combo.leadId}</span>
          {combo.transitionId&&<><span className="text-zinc-600 text-xs">+</span><span className="font-mono text-teal-400 text-xs font-bold">{combo.transitionId}</span></>}
          <span className="text-zinc-600 text-xs">+</span>
          <span className="font-mono text-purple-400 text-xs font-bold">{combo.bodyId}</span>
          <span className="text-zinc-600 text-xs">+</span>
          <span className="font-mono text-pink-400 text-xs font-bold">{combo.ctaId}</span>
        </div>
        <Tag tag={combo.hookTag}/>
        <FilenameField value={combo.filename||combo.autoFilename} onChange={v=>onFilenameChange(combo.key,v)}/>
        {combo.date&&vs&&<span className="text-xs text-zinc-500 whitespace-nowrap ml-1">{combo.date}</span>}
        {vr&&<span className="text-xs text-zinc-500 whitespace-nowrap" title="Date Validated">📅 {vr.validatedAt ? fmtDate(vr.validatedAt) : "—"}</span>}
        {vr?.manual&&vr?.valid&&<span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/25 px-1.5 py-0.5 rounded-full whitespace-nowrap">In Tracker</span>}
        {vr?.manual&&vr?.valid&&<span className="text-xs text-amber-400/70 whitespace-nowrap" title="Date Added to Tracker">🗂 {vr.addedToTrackerAt ? fmtDate(vr.addedToTrackerAt) : "—"}</span>}
        {/* Accordion toggle */}
        <button onClick={()=>setOpen(v=>!v)}
          className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all
            ${open
              ? "bg-zinc-700 border-zinc-600 text-white"
              : "bg-zinc-800/60 border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"}`}>
          <span>🎬</span>
          <span>Source files</span>
          {attachedCount>0&&<span className={`px-1.5 py-0.5 rounded-full text-xs ${open?"bg-zinc-600 text-zinc-300":"bg-zinc-700 text-zinc-400"}`}>{attachedCount}/{totalSlots}</span>}
          <span className="text-zinc-500">{open?"▲":"▼"}</span>
        </button>
      </div>

      {/* ── Accordion panel ── */}
      {open&&(
        <div className="border-t border-zinc-700/40 px-3 pb-3 pt-3 space-y-3">

          {/* Asset source files */}
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-2">Source clips</div>
            <div className={`grid gap-2 ${assetSlots.length===5?"grid-cols-2 md:grid-cols-5":"grid-cols-2 md:grid-cols-4"}`}>
              {assetSlots.map(({id,label,idColor,border,bg})=>{
                const asset=assetMap[id];
                const hasDrive=asset?.driveUrl;
                const hasFile=asset?.videoFileName;
                return (
                  <div key={label} className={`rounded-lg border ${border} ${bg} p-2.5 space-y-1.5`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-mono text-xs font-bold ${idColor}`}>{id}</span>
                      <span className="text-zinc-600 text-xs uppercase tracking-wider">{label}</span>
                    </div>
                    {hasDrive?(
                      <div className="flex items-center gap-1.5">
                        <a href={asset.driveUrl} target="_blank" rel="noreferrer"
                          className="flex-1 text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 min-w-0">
                          <span className="shrink-0">🔗</span><span className="truncate">Drive ↗</span>
                        </a>
                        <CopyMini text={asset.driveUrl}/>
                      </div>
                    ):hasFile?(
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 text-xs text-zinc-300 min-w-0 flex-1">
                          <span className="shrink-0">🎬</span>
                          <span className="truncate">{asset.videoFileName}</span>
                        </div>
                        <CopyMini text={asset.videoFileName}/>
                      </div>
                    ):(
                      <div className="text-xs text-zinc-700 italic">No video attached</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Final output URL */}
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-2">Final output URL</div>
            <div className="flex items-center gap-2">
              <input value={combo.url||""} onChange={e=>onUrlChange(combo.key,e.target.value)}
                placeholder="Paste final rendered video URL here..."
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"/>
              {combo.url&&(
                <div className="flex items-center gap-1.5 shrink-0">
                  <CopyMini text={combo.url}/>
                  <a href={combo.url} target="_blank" rel="noreferrer"
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors whitespace-nowrap">
                    Open ↗
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Sync to Sheets */}
          {sheetsUrl&&(
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <div className="text-xs text-zinc-600">Push this row to Google Sheets</div>
              <button onClick={onSync} disabled={syncStatus==="syncing"}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all
                  ${syncStatus==="synced"  ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                  : syncStatus==="error"   ? "bg-red-500/20 border border-red-500/40 text-red-400"
                  : syncStatus==="syncing" ? "bg-zinc-700 text-zinc-400 cursor-wait"
                  : "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-emerald-600 hover:border-emerald-600 hover:text-white"}`}>
                {syncStatus==="synced"  ? "✅ Synced to Sheets"
                :syncStatus==="error"   ? "❌ Failed — retry"
                :syncStatus==="syncing" ? "⟳ Syncing..."
                : "⬆ Sync to Sheets"}
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function TrackerTab({ combos, onToggle, onSetVideoStatus, onUrlChange, onFilenameChange, validationStore, setValidationStore, validPairs, locked, autoAddToTracker, preHooks, hooks, leads, bodies, ctas, sheetsUrl, syncState, onSyncRow, onSyncAll, buildRow, setStitchQueue, setTab }) {
  const [tagSet,setTagSet]=useState(new Set());
  const [search,setSearch]=useState("");
  const [preHookFilter,setPreHookFilter]=useState("All");
  const [hookFilter,setHookFilter]=useState("All");
  const [leadFilter,setLeadFilter]=useState("All");
  const [bodyFilter,setBodyFilter]=useState("All");
  const [statusFilter,setStatusFilter]=useState("All");
  const [speakerFilter,setSpeakerFilter]=useState("All");
  const [selectedTrackerKeys,setSelectedTrackerKeys]=useState(new Set());
  const [trackerSortBy,setTrackerSortBy]=useState("newest");
  const toggleTrackerSelect=(key,val)=>setSelectedTrackerKeys(prev=>{const n=new Set(prev);val?n.add(key):n.delete(key);return n;});

  const vrMap=useMemo(()=>{ const m={}; Object.values(validationStore).forEach(r=>{m[`${r.hookId}+${r.leadId}`]=r;}); return m; },[validationStore]);
  const assetMap=useMemo(()=>{
    const m={};
    [...(preHooks||[]),...hooks,...leads,...bodies,...ctas].forEach(a=>{ m[a.id]=a; });
    return m;
  },[preHooks,hooks,leads,bodies,ctas]);

  // Show combos in tracker:
  // - autoAddToTracker=true: everything the AI marked valid
  // - autoAddToTracker=false (default): only combos explicitly approved by user (manual:true)
  const baseCombos=useMemo(()=>{
    if(Object.keys(validationStore).length===0) return [];
    return combos.filter(c=>{
      const fullKey=`${c.preHookId||"none"}+${c.hookId}+${c.leadId}+${c.transitionId||"none"}+${c.bodyId||"none"}+${c.ctaId||"none"}`;
      const hlKey  =`${c.preHookId||"none"}+${c.hookId}+${c.leadId}+none+none+none`;
      const vFull=validationStore[fullKey];
      const vHl  =validationStore[hlKey];
      const vr   =vFull||vHl;
      if(!vr||vr.valid!==true) return false;
      // When auto-add is off, only show combos the user explicitly approved
      if(!autoAddToTracker && !vr.manual) return false;
      return true;
    });
  },[combos,validationStore,autoAddToTracker]);

  const uniquePreHooks=["All","(none)",...new Set(baseCombos.map(c=>c.preHookId).filter(Boolean))];
  const uniqueHooks   =["All",...new Set(baseCombos.map(c=>c.hookId))];
  const uniqueLeads   =["All",...new Set(baseCombos.map(c=>c.leadId))];
  const uniqueBodies  =["All",...new Set(baseCombos.map(c=>c.bodyId))];

  // Collect all speaker names present on hook or lead assets in this combo set
  const trackerSpeakers=useMemo(()=>{
    const names=new Set();
    baseCombos.forEach(c=>{
      const hs=assetMap[c.hookId]?.speaker; if(hs) names.add(hs);
      const ls=assetMap[c.leadId]?.speaker; if(ls) names.add(ls);
    });
    return [...names].sort();
  },[baseCombos,assetMap]);

  const filtered=baseCombos.filter(c=>{
    const vr=vrMap[`${c.hookId}+${c.leadId}`];
    const hSpeaker=assetMap[c.hookId]?.speaker||"";
    const lSpeaker=assetMap[c.leadId]?.speaker||"";
    const matchTag      =tagSet.size===0||tagMatch(c.hookTag,tagSet)||tagMatch(c.leadTag,tagSet);
    const matchSearch   =search===""||[c.preHookId,c.hookId,c.leadId,c.bodyId,c.ctaId,hSpeaker,lSpeaker].some(x=>x&&x.toLowerCase().includes(search.toLowerCase()));
    const matchPreHook  =preHookFilter==="All"||(preHookFilter==="(none)"&&!c.preHookId)||(c.preHookId===preHookFilter);
    const matchHook     =hookFilter==="All"||c.hookId===hookFilter;
    const matchLead     =leadFilter==="All"||c.leadId===leadFilter;
    const matchBody     =bodyFilter==="All"||c.bodyId===bodyFilter;
    const matchSpeaker  =speakerFilter==="All"||hSpeaker===speakerFilter||lSpeaker===speakerFilter;
    const vs=c.videoStatus;
    const matchStatus   =statusFilter==="All"
      ||(statusFilter==="Approved"&&vs==="approved")
      ||(statusFilter==="Stitched"&&vs==="stitched")
      ||(statusFilter==="Unusable"&&vs==="rejected")
      ||(statusFilter==="Pending"&&!vs)
      ||(statusFilter==="Valid"&&vr?.valid===true)
      ||(statusFilter==="Invalid"&&vr?.valid===false);
    return matchTag&&matchSearch&&matchPreHook&&matchHook&&matchLead&&matchBody&&matchSpeaker&&matchStatus;
  }).sort((a,b)=>{
    const vra=vrMap[`${a.hookId}+${a.leadId}`];
    const vrb=vrMap[`${b.hookId}+${b.leadId}`];
    const ts=trackerSortBy.includes("tracker")
      ? (c,v)=>v?.addedToTrackerAt||""
      : (c,v)=>v?.validatedAt||"";
    const ta=ts(a,vra), tb=ts(b,vrb);
    return trackerSortBy==="oldest"||trackerSortBy==="tracker-oldest" ? ta.localeCompare(tb) : tb.localeCompare(ta);
  });

  const doneCombos=baseCombos.filter(c=>c.videoStatus==="approved").length;
  const stitchedCombos=baseCombos.filter(c=>c.videoStatus==="stitched").length;
  const rejectedCombos=baseCombos.filter(c=>c.videoStatus==="rejected").length;
  const validTotal=validPairs>0?validPairs:baseCombos.length;

  return (
    <div>
      {locked&&(
        <div className="mb-4 flex items-center gap-2 p-2.5 bg-amber-500/8 border border-amber-500/25 rounded-lg">
          <span className="text-amber-400 text-sm">🔒</span>
          <span className="text-amber-400 text-xs font-medium">Locked view — showing {baseCombos.length} valid combos only.</span>
        </div>
      )}
      {Object.keys(validationStore).length>0&&(
        <div className="mb-5 p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center gap-4 flex-wrap">
          <div className="text-sm text-zinc-400">
            {locked?"Valid combos in tracker:":"After validation:"} <span className="text-emerald-400 font-bold">{baseCombos.length} valid</span>
          </div>
          <div className="text-sm text-zinc-400 flex flex-wrap gap-x-3 gap-y-1">
            <span>✅ Approved: <span className="text-emerald-400 font-bold">{doneCombos}</span></span>
            {stitchedCombos>0&&<span>🎬 Pending review: <span className="text-amber-400 font-bold">{stitchedCombos}</span></span>}
            {rejectedCombos>0&&<span>❌ Unusable: <span className="text-red-400 font-bold">{rejectedCombos}</span></span>}
            <span className="text-zinc-600">/ {baseCombos.length} total</span>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-3">
        {[{label:"Pre-hook",value:preHookFilter,set:setPreHookFilter,options:uniquePreHooks},
          {label:"Hook",    value:hookFilter,    set:setHookFilter,   options:uniqueHooks   },
          {label:"Lead",    value:leadFilter,    set:setLeadFilter,   options:uniqueLeads   },
          {label:"Body",    value:bodyFilter,    set:setBodyFilter,   options:uniqueBodies  }].map(({label,value,set,options})=>(
          <div key={label} className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">{label}:</span>
            <select value={value} onChange={e=>set(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500">
              {options.map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
        {trackerSpeakers.length>0&&(
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">Speaker:</span>
            <select value={speakerFilter} onChange={e=>setSpeakerFilter(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500">
              {["All",...trackerSpeakers].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500">Status:</span>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500">
            {["All","Approved","Stitched","Unusable","Pending","Valid","Invalid"].map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <FilterBar tagSet={tagSet} setTagSet={setTagSet} search={search} setSearch={setSearch}/>
        <select value={trackerSortBy} onChange={e=>setTrackerSortBy(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-amber-500 shrink-0">
          <option value="newest">📅 Validated: Newest</option>
          <option value="oldest">📅 Validated: Oldest</option>
          <option value="tracker-newest">🗂 Tracker: Newest</option>
          <option value="tracker-oldest">🗂 Tracker: Oldest</option>
        </select>
      </div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <input type="checkbox"
            checked={filtered.length>0&&filtered.every(c=>selectedTrackerKeys.has(c.key))}
            ref={el=>{if(el)el.indeterminate=filtered.some(c=>selectedTrackerKeys.has(c.key))&&!filtered.every(c=>selectedTrackerKeys.has(c.key));}}
            onChange={()=>{
              const allSel=filtered.every(c=>selectedTrackerKeys.has(c.key));
              setSelectedTrackerKeys(prev=>{const n=new Set(prev);filtered.forEach(c=>allSel?n.delete(c.key):n.add(c.key));return n;});
            }}
            className="accent-teal-500 w-3.5 h-3.5 cursor-pointer" title="Select all visible"/>
          <div className="text-xs text-zinc-500">{filtered.length} approved combo{filtered.length!==1?"s":""}{locked?" (locked view)":""}</div>
        </div>
        {sheetsUrl&&filtered.length>0&&(
          <button onClick={()=>onSyncAll(filtered)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors">
            <span>⬆</span> Sync all to Sheets ({filtered.length})
          </button>
        )}
        {!sheetsUrl&&(
          <span className="text-xs text-zinc-600">Add a Sheets URL in ⚙ Settings to enable sync</span>
        )}
      </div>
      <div className="space-y-2">
        {filtered.length===0&&(
          <div className="text-center py-16 space-y-2">
            {Object.keys(validationStore).length===0
              ? <><div className="text-zinc-500 text-sm">No validated combos yet.</div><div className="text-zinc-600 text-xs">Run AI Validate first — only approved combos appear here.</div></>
              : <div className="text-zinc-600 text-sm">No approved combos match your filters.</div>
            }
          </div>
        )}
        {filtered.map(combo=>{
          const vr=validationStore[combo.key]||validationStore[`${combo.preHookId||"none"}+${combo.hookId}+${combo.leadId}+none+none+none`];
          return (
            <ComboRow key={combo.key} combo={combo} vr={vr} assetMap={assetMap}
              onToggle={onToggle} onSetVideoStatus={onSetVideoStatus} onUrlChange={onUrlChange} onFilenameChange={onFilenameChange}
              sheetsUrl={sheetsUrl} syncStatus={syncState[combo.key]}
              onSync={()=>onSyncRow(combo,vr)}
              selected={selectedTrackerKeys.has(combo.key)}
              onSelect={val=>toggleTrackerSelect(combo.key,val)}/>
          );
        })}
      </div>

      {/* Floating selection bar */}
      {selectedTrackerKeys.size>0&&(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-zinc-900 border border-teal-500/40 rounded-full shadow-2xl shadow-black/60">
          <span className="text-sm text-white font-semibold">{selectedTrackerKeys.size} selected</span>
          <span className="text-zinc-600">|</span>
          <button onClick={()=>setSelectedTrackerKeys(new Set())} className="text-xs text-zinc-400 hover:text-white transition-colors">Clear</button>
          {setStitchQueue&&setTab&&(
            <button
              onClick={()=>{setStitchQueue(new Set(selectedTrackerKeys));setSelectedTrackerKeys(new Set());setTab("stitch");}}
              className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-black text-xs font-bold rounded-full transition-colors">
              🎬 Send to Stitcher
            </button>
          )}
          {setValidationStore&&(
            <button
              onClick={()=>{
                if(!window.confirm(`Remove ${selectedTrackerKeys.size} combo${selectedTrackerKeys.size!==1?"s":""} from Tracker? This deletes their validation results.`)) return;
                setValidationStore(prev=>{
                  const n={...prev};
                  selectedTrackerKeys.forEach(comboKey=>{
                    // Try exact key first
                    if(n[comboKey]){ delete n[comboKey]; return; }
                    // Fall back to hook+lead-only key (when validated without body/CTA)
                    const combo=baseCombos.find(c=>c.key===comboKey);
                    if(combo){
                      const hlKey=`${combo.preHookId||"none"}+${combo.hookId}+${combo.leadId}+none+none+none`;
                      delete n[hlKey];
                    }
                  });
                  return n;
                });
                setSelectedTrackerKeys(new Set());
              }}
              className="px-3 py-1.5 bg-red-500 hover:bg-red-400 text-white text-xs font-bold rounded-full transition-colors">
              🗑 Delete {selectedTrackerKeys.size}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const SHEET_COLUMNS = [
  "Completed",
  "Filename",
  "Status",
  "Date Completed",
  "Final Output URL",
  "Pre-Hook ID","Pre-Hook Source",
  "Hook ID","Hook Descriptor","Hook Source",
  "Lead ID","Lead Source",
  "Body ID","Body Source",
  "CTA ID","CTA Source",
  "Tag","Validation Mode","AI Verdict","AI Reason",
];

function CopyColumnsButton() {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    copyText(SHEET_COLUMNS.join("\t"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150
        ${copied ? "bg-emerald-500 text-black" : "bg-zinc-800 border border-zinc-700 text-amber-400 hover:bg-amber-500 hover:text-black hover:border-amber-500"}`}>
      {copied ? "✓ Copied! Paste into Row 1 of your Sheet" : "📋 Copy column headers"}
    </button>
  );
}

const APPS_SCRIPT_CODE = [
  "function doPost(e) {",
  "  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();",
  "  const data = JSON.parse(e.postData.contents);",
  "  const columns = [",
  '    "Completed","Filename","Status","Date Completed","Final Output URL",',
  '    "Pre-Hook ID","Pre-Hook Source",',
  '    "Hook ID","Hook Descriptor","Hook Source",',
  '    "Lead ID","Lead Source",',
  '    "Body ID","Body Source",',
  '    "CTA ID","CTA Source",',
  '    "Tag","Validation Mode","AI Verdict","AI Reason"',
  "  ];",
  "  const row = columns.map(col => data[col] ?? '');",
  "  sheet.appendRow(row);",
  "  return ContentService",
  "    .createTextOutput(JSON.stringify({ status: 'ok' }))",
  "    .setMimeType(ContentService.MimeType.JSON);",
  "}",
].join("\n");

function AdminModal({ anthropicKey, setAnthropicKey, onClose, onSupabaseSaved }) {
  const [sbUrl,  setSbUrl]  = useState(()=>localStorage.getItem("avs_supabase_url")||"");
  const [sbKey,  setSbKey]  = useState(()=>localStorage.getItem("avs_supabase_key")||"");
  const [sbTest, setSbTest] = useState(null);
  const [apiInput, setApiInput] = useState(anthropicKey||"");
  const [apiTest,  setApiTest]  = useState(null);
  const isSbConnected = !!(localStorage.getItem("avs_supabase_url")&&localStorage.getItem("avs_supabase_key"));

  const saveSupabase = async()=>{
    localStorage.setItem("avs_supabase_url", sbUrl.trim());
    localStorage.setItem("avs_supabase_key", sbKey.trim());
    setSbTest("testing");
    try {
      const res = await fetch(`${sbUrl.trim()}/rest/v1/clients?limit=1`,{
        headers:{"apikey":sbKey.trim(),"Authorization":`Bearer ${sbKey.trim()}`}
      });
      setSbTest(res.ok?"ok":"error");
      if(res.ok && onSupabaseSaved) onSupabaseSaved();
    } catch { setSbTest("error"); }
  };

  const saveApiKey = async()=>{
    setAnthropicKey(apiInput.trim());
    setApiTest("testing");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":apiInput.trim(),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:10,messages:[{role:"user",content:"hi"}]})
      });
      setApiTest(res.ok?"ok":"error");
    } catch { setApiTest("error"); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-white font-black text-lg">Admin Settings</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl">✕</button>
        </div>
        <div className="px-6 py-5 space-y-6">

          {/* Supabase */}
          <div className="bg-zinc-800 border border-violet-500/40 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold text-sm">Supabase Database</h3>
              <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-xs font-bold rounded-full">Persistent Storage</span>
              {isSbConnected&&<span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">✅ Connected</span>}
            </div>
            <p className="text-zinc-400 text-xs">Your data survives cache clears and works on any device. Get your URL + anon key from <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-violet-400 underline">supabase.com</a> → Project Settings → API.</p>
            <input value={sbUrl} onChange={e=>setSbUrl(e.target.value)} placeholder="https://xxxx.supabase.co"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 font-mono"/>
            <input value={sbKey} onChange={e=>setSbKey(e.target.value)} type="password" placeholder="anon public key"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 font-mono"/>
            <div className="flex items-center gap-3">
              <button onClick={saveSupabase} className="px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white text-sm font-bold rounded-lg transition-colors">
                {sbTest==="testing"?"Testing...":"Save & Test"}
              </button>
              {sbTest==="ok"&&<span className="text-emerald-400 text-sm">✅ Connected!</span>}
              {sbTest==="error"&&<span className="text-red-400 text-sm">❌ Failed — check URL and key</span>}
            </div>
          </div>

          {/* Anthropic API Key */}
          <div className="bg-zinc-800 border border-amber-500/30 rounded-xl p-5 space-y-3">
            <h3 className="text-white font-bold text-sm">Anthropic API Key</h3>
            <p className="text-zinc-400 text-xs">Required for AI Validate. Get yours at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-amber-400 underline">console.anthropic.com</a>.</p>
            <input value={apiInput} onChange={e=>setApiInput(e.target.value)} type="password" placeholder="sk-ant-..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"/>
            <div className="flex items-center gap-3">
              <button onClick={saveApiKey} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold rounded-lg transition-colors">
                {apiTest==="testing"?"Testing...":"Save & Test Key"}
              </button>
              {apiTest==="ok"&&<span className="text-emerald-400 text-sm">✅ Key works!</span>}
              {apiTest==="error"&&<span className="text-red-400 text-sm">❌ Invalid key</span>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function SettingsTab({ sheetsUrl, setSheetsUrl, sheetyUrl, setSheetyUrl, sheetyToken, setSheetyToken, zapierUrl, setZapierUrl }) {
  const [scriptInput,setScriptInput]=useState(sheetsUrl);
  const [sheetyInput,setSheetyInput]=useState(sheetyUrl);
  const [tokenInput,setTokenInput]=useState(sheetyToken);
  const [zapierInput,setZapierInput]=useState(zapierUrl);
  const [testState,setTestState]=useState(null);
  const [sheetyTestState,setSheetyTestState]=useState(null);
  const [zapierTestState,setZapierTestState]=useState(null);

  const saveZapier=()=>{ setZapierUrl(zapierInput.trim()); setZapierTestState(null); };
  const saveScript=()=>{ setSheetsUrl(scriptInput.trim()); };
  const saveSheetyFn=()=>{ setSheetyUrl(sheetyInput.trim()); setSheetyToken(tokenInput.trim()); };

  const testZapier=async()=>{
    if(!zapierInput.trim()) return;
    setZapierTestState("testing");
    try {
      const res=await fetch(zapierInput.trim(),{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({"Completed":"","Filename":"TEST_ROW","Status":"Test","Date Completed":"",
          "Final Output URL":"","Pre-Hook ID":"—","Pre-Hook Source":"","Hook ID":"H0",
          "Hook Descriptor":"test","Hook Source":"","Lead ID":"L0","Lead Source":"",
          "Body ID":"B0","Body Source":"","CTA ID":"CTA0","CTA Source":"",
          "Tag":"Test","Validation Mode":"grammar","AI Verdict":"✅ Valid","AI Reason":"Connection test — delete this row."})
      });
      setZapierTestState(res.ok?"ok":"manual");
    } catch { setZapierTestState("manual"); }
  };

  const testScript=async()=>{
    if(!scriptInput.trim()) return;
    setTestState("testing");
    try {
      fetch(scriptInput.trim(),{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain"},
        body:JSON.stringify({"Completed":"","Filename":"TEST_ROW","Status":"Test","Date Completed":"","Final Output URL":"",
          "Pre-Hook ID":"—","Pre-Hook Source":"","Hook ID":"H0","Hook Descriptor":"","Hook Source":"",
          "Lead ID":"L0","Lead Source":"","Body ID":"—","Body Source":"","CTA ID":"—","CTA Source":"",
          "Tag":"Test","Validation Mode":"grammar","AI Verdict":"✅ Valid","AI Reason":"Connection test — delete this row."})});
      setTestState("check");
    } catch { setTestState("error"); }
  };

  const testSheety=async()=>{
    if(!sheetyInput.trim()) return;
    setSheetyTestState("testing");
    try {
      const sheetName=sheetyInput.trim().split("/").pop();
      const headers={"Content-Type":"application/json"};
      if(tokenInput.trim()) headers["Authorization"]=`Bearer ${tokenInput.trim()}`;
      const res=await fetch(sheetyInput.trim(),{method:"POST",headers,
        body:JSON.stringify({[sheetName]:{completed:"",filename:"TEST_ROW",status:"Test",
          dateCompleted:"",finalOutputUrl:"",hookId:"H0",leadId:"L0",
          tag:"Test",aiVerdict:"✅ Valid",aiReason:"Connection test — delete this row."}})});
      setSheetyTestState(res.ok?"ok":"error");
    } catch { setSheetyTestState("error"); }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-white font-black text-lg mb-1">Sync Settings</h2>
        <p className="text-zinc-400 text-sm">Connect to Google Sheets. Zapier is the recommended method.</p>
      </div>

      {/* ── ZAPIER — DEFAULT ── */}
      <div className="bg-zinc-900 border border-amber-500/40 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-bold text-sm">Zapier Webhook</h3>
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full">Default</span>
          {zapierUrl&&<span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">✅ Connected</span>}
        </div>
        {[
          {n:1, text:'In Zapier, create a new Zap. Choose "Webhooks by Zapier" as the trigger, select "Catch Hook"'},
          {n:2, text:"Copy the webhook URL Zapier gives you and paste it below"},
          {n:3, text:'Set the action to "Google Sheets → Create Spreadsheet Row", map the fields, turn the Zap on'},
        ].map(s=>(
          <div key={s.n} className="flex gap-3">
            <div className="w-5 h-5 rounded-full bg-amber-500 text-black text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{s.n}</div>
            <p className="text-zinc-400 text-sm leading-snug">{s.text}</p>
          </div>
        ))}
        <div className="flex gap-2">
          <input value={zapierInput} onChange={e=>setZapierInput(e.target.value)}
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"/>
          <button onClick={saveZapier} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold rounded-lg transition-colors">Save</button>
        </div>
        {zapierInput&&<div className="flex items-center gap-3">
          <button onClick={testZapier} disabled={zapierTestState==="testing"}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg border border-zinc-700 transition-colors">
            {zapierTestState==="testing"?"Testing...":"Test Connection"}
          </button>
          {zapierTestState==="ok"&&<span className="text-emerald-400 text-sm">✅ Connected! Check your Zap history for the test row.</span>}
          {zapierTestState==="error"&&<span className="text-red-400 text-sm">❌ Failed — check the URL and that your Zap is turned on</span>}
          {zapierTestState==="manual"&&(
            <div className="mt-3 bg-zinc-800 border border-zinc-700 rounded-xl p-4 space-y-2 w-full">
              <p className="text-amber-400 text-xs font-semibold">The browser blocked the request. Send the test manually:</p>
              <p className="text-zinc-400 text-xs">1. Open a terminal or use <a href="https://reqbin.com" target="_blank" rel="noreferrer" className="text-amber-400 underline">reqbin.com</a></p>
              <p className="text-zinc-400 text-xs">2. POST to your webhook URL with this JSON body:</p>
              <div className="flex items-start gap-2">
                <pre className="text-xs text-zinc-300 bg-zinc-950 rounded-lg p-3 border border-zinc-700 flex-1 whitespace-pre-wrap overflow-x-auto">{JSON.stringify({"Completed":"","Filename":"TEST_ROW","Status":"Test","Date Completed":"","Final Output URL":"","Pre-Hook ID":"—","Pre-Hook Source":"","Hook ID":"H0","Hook Descriptor":"test","Hook Source":"","Lead ID":"L0","Lead Source":"","Body ID":"B0","Body Source":"","CTA ID":"CTA0","CTA Source":"","Tag":"Test","Validation Mode":"grammar","AI Verdict":"✅ Valid","AI Reason":"Connection test"},null,2)}</pre>
                <CopyMini text={JSON.stringify({"Completed":"","Filename":"TEST_ROW","Status":"Test","Date Completed":"","Final Output URL":"","Pre-Hook ID":"—","Pre-Hook Source":"","Hook ID":"H0","Hook Descriptor":"test","Hook Source":"","Lead ID":"L0","Lead Source":"","Body ID":"B0","Body Source":"","CTA ID":"CTA0","CTA Source":"","Tag":"Test","Validation Mode":"grammar","AI Verdict":"✅ Valid","AI Reason":"Connection test"},null,2)}/>
              </div>
            </div>
          )}
        </div>}
      </div>

      {/* ── SHEETY ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-bold text-sm">Sheety.co</h3>
          {sheetyUrl&&<span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">✅ Connected</span>}
        </div>
        <p className="text-zinc-400 text-sm">Sign in at <a href="https://sheety.co" target="_blank" rel="noreferrer" className="text-amber-400 underline">sheety.co</a> with Google, paste your Sheet URL, copy the API endpoint.</p>
        <p className="text-amber-400/80 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">⚠️ Sheety converts column headers to camelCase automatically.</p>
        <div className="space-y-2">
          <input value={sheetyInput} onChange={e=>setSheetyInput(e.target.value)} placeholder="https://api.sheety.co/yourId/yourSheet/sheet1" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"/>
          <input value={tokenInput} onChange={e=>setTokenInput(e.target.value)} placeholder="Bearer token (optional)" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"/>
          <div className="flex items-center gap-3 pt-1">
            <button onClick={saveSheetyFn} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-bold rounded-lg transition-colors">Save</button>
            {sheetyInput&&<button onClick={testSheety} disabled={sheetyTestState==="testing"} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg border border-zinc-700 transition-colors">{sheetyTestState==="testing"?"Testing...":"Test"}</button>}
            {sheetyTestState==="ok"&&<span className="text-emerald-400 text-sm">✅ Connected!</span>}
            {sheetyTestState==="error"&&<span className="text-red-400 text-sm">❌ Failed</span>}
          </div>
        </div>
      </div>

      {/* ── APPS SCRIPT ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-bold text-sm">Apps Script</h3>
          {sheetsUrl&&<span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">✅ Connected</span>}
        </div>
        <p className="text-zinc-400 text-sm">Paste this script into Extensions → Apps Script in your Sheet, deploy as a Web App (access: Anyone).</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Apps Script code</span>
          <CopyMini text={APPS_SCRIPT_CODE}/>
        </div>
        <pre className="text-xs text-zinc-400 bg-zinc-950 rounded-lg p-3 overflow-x-auto border border-zinc-800 whitespace-pre-wrap leading-relaxed">{APPS_SCRIPT_CODE}</pre>
        <div className="flex gap-2">
          <input value={scriptInput} onChange={e=>setScriptInput(e.target.value)} placeholder="https://script.google.com/macros/s/YOUR_ID/exec" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"/>
          <button onClick={saveScript} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-bold rounded-lg transition-colors">Save</button>
        </div>
        {sheetsUrl&&<div className="flex items-center gap-3">
          <button onClick={testScript} disabled={testState==="testing"} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg border border-zinc-700 transition-colors">{testState==="testing"?"Testing...":"Test"}</button>
          {testState==="check"&&<span className="text-amber-400 text-sm">📋 Sent — check your Sheet for TEST_ROW</span>}
          {testState==="error"&&<span className="text-red-400 text-sm">❌ Failed</span>}
        </div>}
      </div>

      {/* Column headers */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <h3 className="text-white font-bold text-sm">Sheet column headers</h3>
        <p className="text-zinc-500 text-xs">Your Sheet's Row 1 should have these column names. Zapier lets you map fields manually so exact names don't matter there.</p>
        <div className="flex flex-wrap gap-2">
          {SHEET_COLUMNS.map((col,i)=>(
            <span key={col} className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono">
              <span className="text-zinc-600">{i+1}.</span>
              <span className="text-zinc-300">{col}</span>
            </span>
          ))}
        </div>
        <CopyColumnsButton/>
      </div>
    </div>
  );
}

// ── Stitch Tab ────────────────────────────────────────────────────────────
function StitchTab({ combos, validationStore, preHooks, hooks, transitions, leads, bodies, ctas, onMarkCreated, stitchQueue, setStitchQueue }) {
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [uploadedFiles, setUploadedFiles] = useState({});   // segId -> File
  const [batchStatus, setBatchStatus] = useState({});        // comboKey -> "stitching"|"done"|"error"
  const [batchErrors, setBatchErrors] = useState({});        // comboKey -> string
  const [batchRunning, setBatchRunning] = useState(false);
  const [currentlyStitching, setCurrentlyStitching] = useState(null);
  const [statusLabel, setStatusLabel] = useState("");
  const ffmpegRef = useRef(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  const assetMap = useMemo(() => {
    const m = {};
    [...preHooks, ...hooks, ...(transitions||[]), ...leads, ...bodies, ...ctas].forEach(a => { m[a.id] = a; });
    return m;
  }, [preHooks, hooks, transitions, leads, bodies, ctas]);

  // Fix key mismatch: fall back to hook+lead-only key
  // If a stitchQueue exists (sent from Tracker), only show those combos
  const validCombos = useMemo(() => {
    const all = combos.filter(c => {
      const fullKey = `${c.preHookId||"none"}+${c.hookId}+${c.leadId}+${c.transitionId||"none"}+${c.bodyId||"none"}+${c.ctaId||"none"}`;
      const hlKey   = `${c.preHookId||"none"}+${c.hookId}+${c.leadId}+none+none+none`;
      const vr = validationStore[fullKey] || validationStore[hlKey];
      return vr && vr.valid === true;
    });
    if (stitchQueue && stitchQueue.size > 0) return all.filter(c => stitchQueue.has(c.key));
    return all;
  }, [combos, validationStore, stitchQueue]);

  const getSlots = (combo) => {
    const s = [];
    if (combo.preHookId)    s.push({ id: combo.preHookId,    label: "Pre-hook"   });
    s.push({ id: combo.hookId, label: "Hook" });
    s.push({ id: combo.leadId, label: "Lead" });
    if (combo.transitionId) s.push({ id: combo.transitionId, label: "Transition" });
    if (combo.bodyId) s.push({ id: combo.bodyId, label: "Body" });
    if (combo.ctaId)  s.push({ id: combo.ctaId,  label: "CTA"  });
    return s;
  };

  const comboReadiness = (combo) => {
    const slots = getSlots(combo);
    const ready = slots.filter(s => uploadedFiles[s.id] || assetMap[s.id]?.driveUrl).length;
    return { ready, total: slots.length, allReady: ready === slots.length };
  };

  const ensureFFmpeg = async () => {
    if (!ffmpegRef.current) {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      ffmpegRef.current = new FFmpeg();
    }
    if (!ffmpegLoaded) {
      const { toBlobURL } = await import("@ffmpeg/util");
      const base = "https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm";
      await ffmpegRef.current.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      });
      setFfmpegLoaded(true);
    }
    return ffmpegRef.current;
  };

  const stitchOne = async (combo) => {
    const STITCH_URL = "https://avs-stitch-server-production.up.railway.app";
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not connected — check Admin settings.");

    const slots = getSlots(combo);
    const clips = slots.map(slot => ({
      id: slot.id,
      storagePath: assetMap[slot.id]?.storagePath || null,
      driveUrl: assetMap[slot.id]?.driveUrl || null,
    }));

    // Verify all clips have a source
    for (const clip of clips) {
      if (!clip.storagePath && !clip.driveUrl) {
        throw new Error(`No source for clip "${clip.id}" — add a Drive URL or upload to Storage first.`);
      }
    }

    const comboName = (combo.filename || combo.autoFilename || combo.key).replace(/[^a-zA-Z0-9_-]/g, "_");

    // Call Railway backend via Server-Sent Events
    setStatusLabel("Connecting to stitch server…");
    const resp = await fetch(`${STITCH_URL}/api/stitch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clips, comboName, supabaseUrl: sb.url, supabaseKey: sb.key }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Stitch server error: ${err}`);
    }

    // Read SSE progress stream
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let jobId = null;
    let dlFilename = comboName + ".mp4";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.status === "done") {
            jobId = data.jobId;
            if (data.filename) dlFilename = data.filename;
          } else if (data.status === "error") {
            throw new Error(data.message);
          } else {
            setStatusLabel(data.status);
          }
        } catch (e) {
          if (e.message && !e.message.startsWith("JSON")) throw e;
        }
      }
    }

    if (!jobId) throw new Error("No download job received from stitch server.");

    // Auto-download directly from Railway
    const dlName = dlFilename.endsWith(".mp4") ? dlFilename : dlFilename + ".mp4";
    const a = document.createElement("a");
    a.href = `${STITCH_URL}/api/download/${jobId}`;
    a.download = dlName;
    a.click();
  };

  const handleStitchSelected = async () => {
    const toProcess = validCombos.filter(c => selectedKeys.has(c.key));
    if (!toProcess.length) return;
    setBatchRunning(true);
    setStatusLabel("Loading FFmpeg (one-time ~10 MB download)…");
    try { await ensureFFmpeg(); } catch(e) { setBatchRunning(false); setStatusLabel(""); return; }
    for (const combo of toProcess) {
      setCurrentlyStitching(combo.key);
      setBatchStatus(prev => ({ ...prev, [combo.key]: "stitching" }));
      try {
        await stitchOne(combo);
        setBatchStatus(prev => ({ ...prev, [combo.key]: "done" }));
        onMarkCreated && onMarkCreated(combo.key);
      } catch (e) {
        setBatchStatus(prev => ({ ...prev, [combo.key]: "error" }));
        setBatchErrors(prev => ({ ...prev, [combo.key]: e?.message || "Unknown error" }));
      }
    }
    setCurrentlyStitching(null);
    setBatchRunning(false);
    setStatusLabel("");
  };

  const toggleKey = key => setSelectedKeys(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const allSelected = validCombos.length > 0 && validCombos.every(c => selectedKeys.has(c.key));
  const selectedCount = validCombos.filter(c => selectedKeys.has(c.key)).length;
  const readySelected = validCombos.filter(c => selectedKeys.has(c.key) && comboReadiness(c).allReady).length;
  const notReadySelected = selectedCount - readySelected;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-white font-black text-lg mb-1">Video Stitcher</h2>
        <p className="text-zinc-400 text-sm">Select AI-approved combos and stitch them into MP4s — runs in your browser. Each segment pulls from its Drive URL automatically, or you can upload a file directly.</p>
      </div>

      {validCombos.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <div className="text-zinc-500 text-sm">No approved combos yet.</div>
          <div className="text-zinc-600 text-xs">Run AI Validate and lock results first.</div>
        </div>
      )}

      {validCombos.length > 0 && (
        <>
          {/* Queue banner */}
          {stitchQueue&&stitchQueue.size>0&&(
            <div className="flex items-center justify-between p-3 bg-teal-500/10 border border-teal-500/30 rounded-lg">
              <span className="text-teal-300 text-sm font-medium">🎬 Showing {validCombos.length} combo{validCombos.length!==1?"s":""} sent from Tracker</span>
              <button onClick={()=>setStitchQueue(new Set())} className="text-xs text-zinc-400 hover:text-white px-2 py-1 bg-zinc-800 rounded border border-zinc-700">Show all</button>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={allSelected}
                ref={el => { if (el) el.indeterminate = selectedCount > 0 && !allSelected; }}
                onChange={() => setSelectedKeys(allSelected ? new Set() : new Set(validCombos.map(c => c.key)))}
                className="accent-amber-500 w-3.5 h-3.5"/>
              <span className="text-sm text-zinc-400">{validCombos.length} valid combo{validCombos.length !== 1 ? "s" : ""}</span>
            </label>
            {selectedCount > 0 && (
              <button onClick={handleStitchSelected} disabled={batchRunning || readySelected === 0}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-lg text-sm flex items-center gap-2">
                {batchRunning
                  ? <><span className="inline-block animate-spin">⟳</span> Stitching…</>
                  : `▶ Stitch ${selectedCount} selected`}
              </button>
            )}
            {notReadySelected > 0 && !batchRunning && (
              <span className="text-xs text-orange-400">⚠ {notReadySelected} selected missing video sources</span>
            )}
            {statusLabel && (
              <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                <span className="inline-block animate-spin text-amber-400">⟳</span>{statusLabel}
              </span>
            )}
          </div>

          {/* Combo list */}
          <div className="space-y-2">
            {validCombos.map(combo => {
              const { ready, total, allReady } = comboReadiness(combo);
              const st = batchStatus[combo.key];
              const isSelected = selectedKeys.has(combo.key);
              const isActive = currentlyStitching === combo.key;
              const slots = getSlots(combo);
              return (
                <div key={combo.key} className={`rounded-xl border transition-colors ${
                  isActive      ? "border-amber-500/60 bg-amber-500/8" :
                  st === "done" ? "border-emerald-500/40 bg-emerald-500/8" :
                  st === "error"? "border-red-500/40 bg-red-500/8" :
                  isSelected    ? "border-zinc-600 bg-zinc-800/60" :
                                  "border-zinc-700/50 bg-zinc-800/40"}`}>
                  <div className="flex items-center gap-3 p-3 flex-wrap">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleKey(combo.key)} disabled={batchRunning}
                      className="accent-amber-500 w-3.5 h-3.5 shrink-0"/>
                    <div className="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
                      {[combo.preHookId, combo.hookId, combo.leadId, combo.transitionId, combo.bodyId, combo.ctaId].filter(Boolean).map((id, i, arr) => (
                        <span key={id} className="flex items-center gap-1">
                          <span className="font-mono text-amber-400 text-xs font-bold">{id}</span>
                          {i < arr.length - 1 && <span className="text-zinc-600 text-xs">+</span>}
                        </span>
                      ))}
                      <Tag tag={combo.hookTag}/>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${allReady ? "text-emerald-400 bg-emerald-500/15 border border-emerald-500/30" : "text-orange-400 bg-orange-500/15 border border-orange-500/30"}`}>
                      {allReady ? `✓ ${ready}/${total} ready` : `⚠ ${ready}/${total} have video`}
                    </span>
                    {isActive && <span className="text-xs text-amber-400 animate-pulse">⟳ Stitching…</span>}
                    {st === "done"  && <span className="text-xs text-emerald-400 font-bold">✅ Done — downloading</span>}
                    {st === "error" && <span className="text-xs text-red-400 font-bold">❌ Error</span>}
                  </div>
                  {st === "error" && batchErrors[combo.key] && (
                    <div className="mx-3 mb-3 text-xs text-red-400 bg-red-500/10 rounded px-2 py-1.5 whitespace-pre-wrap">{batchErrors[combo.key]}</div>
                  )}
                  {/* Segment rows — always visible when selected */}
                  {isSelected && (
                    <div className="px-3 pb-3 space-y-1.5 border-t border-zinc-700/40 pt-2.5 mt-0.5">
                      {slots.map(slot => {
                        const asset = assetMap[slot.id];
                        const file = uploadedFiles[slot.id];
                        const hasDrive = !!asset?.driveUrl;
                        const hasFile = !!file;
                        const ready = hasDrive || hasFile;
                        return (
                          <div key={slot.id} className="flex items-center gap-2 text-xs">
                            <span className="font-mono text-amber-400 w-10 shrink-0">{slot.id}</span>
                            <span className="text-zinc-500 w-12 shrink-0">{slot.label}</span>
                            {hasFile ? (
                              <span className="flex items-center gap-1.5 text-emerald-400">
                                📁 {file.name}
                                <button onClick={() => setUploadedFiles(p => { const n={...p}; delete n[slot.id]; return n; })}
                                  className="text-zinc-600 hover:text-red-400 text-sm leading-none ml-1">✕</button>
                              </span>
                            ) : hasDrive ? (
                              <span className="flex items-center gap-1.5 text-emerald-400">
                                🔗 Drive linked
                                <label className="cursor-pointer ml-1">
                                  <span className="px-1.5 py-0.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-400 rounded text-xs">Override…</span>
                                  <input type="file" accept="video/mp4,video/quicktime,.mp4,.mov" className="hidden"
                                    onChange={e => { const f=e.target.files?.[0]; if(f) setUploadedFiles(p=>({...p,[slot.id]:f})); }}/>
                                </label>
                              </span>
                            ) : (
                              <label className="cursor-pointer flex items-center gap-1.5 text-orange-400">
                                ⚠ No video —
                                <span className="px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 hover:border-amber-500 text-zinc-300 rounded transition-colors">
                                  Upload file
                                </span>
                                <input type="file" accept="video/mp4,video/quicktime,.mp4,.mov" className="hidden"
                                  onChange={e => { const f=e.target.files?.[0]; if(f) setUploadedFiles(p=>({...p,[slot.id]:f})); }}/>
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-zinc-800/50 border border-zinc-700/40 rounded-lg text-xs text-zinc-500 leading-relaxed">
            <span className="text-zinc-300 font-medium">💡 Tip:</span> Set a Google Drive share link on each asset in the Asset Library and videos pull automatically — no manual upload needed. Sharing must be set to <span className="text-zinc-300">"Anyone with the link → Viewer"</span>. You can also upload files directly per segment. Both work together.
          </div>
        </>
      )}
    </div>
  );
}

function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(()=>fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  } catch { fallbackCopy(text); }
}
function fallbackCopy(text) {
  const el = document.createElement("textarea");
  el.value = text;
  el.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
  document.body.appendChild(el);
  el.focus();
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

// ── Client helpers ────────────────────────────────────────────────────────
// ── Supabase helpers ──────────────────────────────────────────────────────
function getSupabase() {
  const url = localStorage.getItem("avs_supabase_url");
  const key = localStorage.getItem("avs_supabase_key");
  if (!url || !key) return null;
  return { url, key };
}

async function uploadClipToStorage(clientId, assetId, driveUrl) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not connected — check Admin settings.");
  const resp = await fetch(`/api/proxy?url=${encodeURIComponent(driveUrl)}`);
  if (!resp.ok) throw new Error(`Download failed: HTTP ${resp.status}`);
  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("text/html")) throw new Error(`Drive returned HTML — check sharing is "Anyone with the link".`);
  const blob = await resp.blob();
  const ext = ct.includes("quicktime") ? "mov" : "mp4";
  const path = `${clientId}/${assetId}.${ext}`;
  const up = await fetch(`${sb.url}/storage/v1/object/clips/${path}`, {
    method: "POST",
    headers: { "apikey": sb.key, "Authorization": `Bearer ${sb.key}`, "Content-Type": blob.type || "video/mp4", "x-upsert": "true" },
    body: blob,
  });
  if (!up.ok) { const e = await up.text(); throw new Error(e); }
  return path;
}

async function getStorageSignedUrl(storagePath) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not connected.");
  const resp = await fetch(`${sb.url}/storage/v1/object/sign/clips/${storagePath}`, {
    method: "POST",
    headers: { "apikey": sb.key, "Authorization": `Bearer ${sb.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 3600 }),
  });
  if (!resp.ok) throw new Error(`Could not get signed URL for ${storagePath}`);
  const data = await resp.json();
  return `${sb.url}/storage/v1${data.signedURL}`;
}

async function sbFetch(path, options={}) {
  const sb = getSupabase();
  if (!sb) return null;
  const res = await fetch(`${sb.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "apikey": sb.key,
      "Authorization": `Bearer ${sb.key}`,
      "Prefer": "return=representation",
      ...(options.headers||{}),
    }
  });
  if (!res.ok) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

async function loadClients() {
  const sb = getSupabase();
  if (sb) {
    const rows = await sbFetch("clients?order=created_at.asc");
    if (rows) return rows.map(r=>({ id:r.id, companyName:r.company_name, contactName:r.contact_name||"", createdAt:r.created_at }));
  }
  try { return JSON.parse(localStorage.getItem("avs_clients")) || []; } catch { return []; }
}

async function saveClients(clients) {
  // clients list is managed per-record via saveClient/deleteClient
  try { localStorage.setItem("avs_clients", JSON.stringify(clients)); } catch {}
}

async function saveClient(client) {
  const sb = getSupabase();
  if (sb) {
    await sbFetch("clients", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ id:client.id, company_name:client.companyName, contact_name:client.contactName||"" })
    });
  }
  const existing = JSON.parse(localStorage.getItem("avs_clients")||"[]");
  const updated = existing.find(c=>c.id===client.id) ? existing.map(c=>c.id===client.id?client:c) : [...existing, client];
  try { localStorage.setItem("avs_clients", JSON.stringify(updated)); } catch {}
}

async function deleteClient(clientId) {
  const sb = getSupabase();
  if (sb) await sbFetch(`clients?id=eq.${clientId}`, { method:"DELETE" });
  try { localStorage.removeItem(`avs_data_${clientId}`); } catch {}
}

async function loadClientData(clientId) {
  const sb = getSupabase();
  if (sb) {
    const rows = await sbFetch(`client_data?client_id=eq.${clientId}`);
    if (rows && rows.length > 0) return rows[0].data || {};
  }
  try { return JSON.parse(localStorage.getItem(`avs_data_${clientId}`)) || {}; } catch { return {}; }
}

async function saveClientData(clientId, data) {
  const sb = getSupabase();
  if (sb) {
    await sbFetch("client_data", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ client_id:clientId, data, updated_at: new Date().toISOString() })
    });
  }
  try { localStorage.setItem(`avs_data_${clientId}`, JSON.stringify(data)); } catch {}
}

async function saveSetting(key, value) {
  const sb = getSupabase();
  if (sb) {
    await sbFetch("settings", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() })
    });
  }
  try { localStorage.setItem(key, value); } catch {}
}

async function loadAllSettings() {
  const sb = getSupabase();
  if (sb) {
    const rows = await sbFetch("settings");
    if (rows && rows.length > 0) {
      const map = {};
      rows.forEach(r => { map[r.key] = r.value; });
      return map;
    }
  }
  return null;
} 

function ManageClientsModal({ clients, onSave, onDelete, onClose }) {
  const [list, setList] = useState(clients);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ companyName:"", contactName:"" });
  const [adding, setAdding] = useState(false);

  const startAdd = () => { setAdding(true); setEditId(null); setForm({ companyName:"", contactName:"" }); };
  const startEdit = (c) => { setEditId(c.id); setAdding(false); setForm({ companyName:c.companyName, contactName:c.contactName }); };

  const saveEdit = async() => {
    if (!form.companyName.trim()) return;
    const updated = list.map(c => c.id===editId ? {...c, ...form} : c);
    const edited = updated.find(c=>c.id===editId);
    await saveClient(edited);
    setList(updated); setEditId(null); onSave(updated);
  };
  const saveAdd = async() => {
    if (!form.companyName.trim()) return;
    const newClient = { id: `client_${Date.now()}`, companyName: form.companyName.trim(), contactName: form.contactName.trim(), createdAt: new Date().toISOString() };
    await saveClient(newClient);
    const updated = [...list, newClient];
    setList(updated); setAdding(false); onSave(updated);
  };
  const remove = async(id) => {
    if (!window.confirm("Delete this client and all their data?")) return;
    await deleteClient(id);
    const updated = list.filter(c => c.id !== id);
    setList(updated); onDelete(id, updated);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-white font-black text-base">Manage Clients</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
          {list.length===0&&!adding&&<p className="text-zinc-500 text-sm text-center py-4">No clients yet. Add one below.</p>}
          {list.map(c=>(
            <div key={c.id} className="bg-zinc-800 rounded-xl px-4 py-3">
              {editId===c.id ? (
                <div className="space-y-2">
                  <input value={form.companyName} onChange={e=>setForm(f=>({...f,companyName:e.target.value}))} placeholder="Company name" className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"/>
                  <input value={form.contactName} onChange={e=>setForm(f=>({...f,contactName:e.target.value}))} placeholder="Contact name" className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"/>
                  <div className="flex gap-2 pt-1">
                    <button onClick={saveEdit} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg">Save</button>
                    <button onClick={()=>setEditId(null)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-semibold">{c.companyName}</p>
                    {c.contactName&&<p className="text-zinc-400 text-xs mt-0.5">{c.contactName}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>startEdit(c)} className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600">Edit</button>
                    <button onClick={()=>remove(c.id)} className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600">Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {adding&&(
            <div className="bg-zinc-800 rounded-xl px-4 py-3 space-y-2 border border-amber-500/30">
              <input value={form.companyName} onChange={e=>setForm(f=>({...f,companyName:e.target.value}))} placeholder="Company name *" className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"/>
              <input value={form.contactName} onChange={e=>setForm(f=>({...f,contactName:e.target.value}))} placeholder="Contact name" className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"/>
              <div className="flex gap-2 pt-1">
                <button onClick={saveAdd} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg">Add Client</button>
                <button onClick={()=>setAdding(false)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded-lg">Cancel</button>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-zinc-800">
          <button onClick={startAdd} className="w-full px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-amber-500/50 text-amber-400 text-sm font-semibold rounded-xl transition-colors">＋ Add New Client</button>
        </div>
      </div>
    </div>
  );
}

function ClientDropdown({ clients, activeClientId, onSelect, onManage }) {
  const [open, setOpen] = useState(false);
  const active = clients.find(c=>c.id===activeClientId);
  return (
    <div className="relative">
      <button onClick={()=>setOpen(o=>!o)}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm transition-colors">
        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"/>
        <span className="text-white font-medium max-w-32 truncate">{active?.companyName||"Select client"}</span>
        <span className="text-zinc-500 text-xs">{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div className="absolute right-0 top-full mt-1 w-56 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {clients.length===0&&<p className="text-zinc-500 text-xs px-4 py-3">No clients yet</p>}
          {clients.map(c=>(
            <button key={c.id} onClick={()=>{onSelect(c.id);setOpen(false);}}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${c.id===activeClientId?"bg-amber-500/10 text-amber-400":"text-zinc-300 hover:bg-zinc-800"}`}>
              {c.id===activeClientId&&<span className="text-amber-500">✓</span>}
              <div>
                <p className="font-medium">{c.companyName}</p>
                {c.contactName&&<p className="text-zinc-500 text-xs">{c.contactName}</p>}
              </div>
            </button>
          ))}
          <div className="border-t border-zinc-800">
            <button onClick={()=>{onManage();setOpen(false);}} className="w-full text-left px-4 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">⚙ Manage clients</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab,setTab]=useState("library");
  const [stitchQueue,setStitchQueue]=useState(new Set());

  // ── Client management ────────────────────────────────────────────────────
  const [clients,setClients]=useState([]);
  const [activeClientId,setActiveClientId]=useState(()=>localStorage.getItem("avs_active_client")||null);

  // Load clients on mount (async — works with both Supabase and localStorage)
  useEffect(()=>{
    loadClients().then(c=>setClients(c||[]));
    // Load global settings from Supabase if connected
    loadAllSettings().then(s=>{
      if (!s) return;
      if (s["avs_anthropic_key"]) setAnthropicKey(s["avs_anthropic_key"]);
      if (s["avs_zapier_url"])    setZapierUrl(s["avs_zapier_url"]);
      if (s["avs_sheety_url"])    setSheetyUrl(s["avs_sheety_url"]);
      if (s["avs_sheety_token"])  setSheetyToken(s["avs_sheety_token"]);
      if (s["avs_sheets_url"])    setSheetsUrl(s["avs_sheets_url"]);
    });
  },[]);
  const [showClientModal,setShowClientModal]=useState(false);

  const [preHooks,setPreHooks]=useState(INITIAL_PREHOOKS);
  const [hooks, setHooks] =useState(INITIAL_HOOKS);
  const [transitions,setTransitions]=useState(INITIAL_TRANSITIONS);
  const [leads, setLeads] =useState(INITIAL_LEADS);
  const [bodies,setBodies]=useState(INITIAL_BODIES);
  const [ctas,  setCtas]  =useState(INITIAL_CTAS);
  const [speakers,setSpeakers]=useState([]);
  const [comboData,setComboData]=useState({});
  const [validationStore,setValidationStore]=useState({});
  const [locked,setLocked]=useState(false);
  const [validationMode,setValidationMode]=useState("grammar");
  const [autoAddToTracker,setAutoAddToTracker]=useState(false);

  // Pre-hook and Transition are optional — null means "skip"
  // Body and CTA fall back to [null] when empty so H+L-only validated combos still appear in Tracker
  const preHookSlots     = useMemo(()=>[null,...preHooks],[preHooks]);
  const transitionSlots  = useMemo(()=>[null,...transitions],[transitions]);
  const bodySlots        = useMemo(()=>bodies.length>0?bodies:[null],[bodies]);
  const ctaSlots         = useMemo(()=>ctas.length>0?ctas:[null],[ctas]);

  const combos=useMemo(()=>{
    const all=[];
    for(const ph of preHookSlots) for(const h of hooks) for(const l of leads) for(const t of transitionSlots) for(const b of bodySlots) for(const c of ctaSlots){
      const key=`${ph?.id||"none"}+${h.id}+${l.id}+${t?.id||"none"}+${b?.id||"none"}+${c?.id||"none"}`;
      const phDesc=ph?.descriptor?`(${ph.descriptor.replace(/\s+/g,"-")})`:"";
      const hDesc=h.descriptor?`(${h.descriptor.replace(/\s+/g,"-")})`:"";
      const tDesc=t?.descriptor?`(${t.descriptor.replace(/\s+/g,"-")})`:"";
      const autoFilename=`${ph?`${ph.id}${phDesc}`:""}${h.id}${hDesc}${l.id}${t?`${t.id}${tDesc}`:""}${b?b.id:""}${c?c.id:""}`;
      all.push({key,preHookId:ph?.id||null,hookId:h.id,transitionId:t?.id||null,leadId:l.id,bodyId:b?.id||null,ctaId:c?.id||null,
        hookTag:h.tag,leadTag:l.tag,preHookTag:ph?.tag||null,hookDescriptor:h.descriptor||"",
        created:comboData[key]?.created||false,videoStatus:comboData[key]?.videoStatus||null,date:comboData[key]?.date||"",url:comboData[key]?.url||"",
        autoFilename,filename:comboData[key]?.filename||""});
    }
    return all;
  },[preHookSlots,hooks,leads,transitionSlots,bodySlots,ctaSlots,comboData]);

  // Only count results that belong to the current combo scope (exact key or hook+lead-only fallback)
  const comboKeySet=useMemo(()=>new Set(combos.map(c=>c.key)),[combos]);
  const comboHlKeySet=useMemo(()=>new Set(combos.map(c=>`${c.preHookId||"none"}+${c.hookId}+${c.leadId}+none+none+none`)),[combos]);
  const validationResults=useMemo(()=>
    Object.values(validationStore).filter(r=>comboKeySet.has(r.key)||comboHlKeySet.has(r.key)),
  [validationStore,comboKeySet,comboHlKeySet]);
  const validPairs=useMemo(()=>validationResults.filter(r=>r.valid===true).length,[validationResults]);

  const done=combos.filter(c=>c.created).length;
  const total=combos.length;
  const ringTotal=validationResults.length>0?validPairs:total;

  // Called by Stitcher when a combo finishes rendering — marks as "stitched, pending review"
  const toggleCombo=key=>setComboData(prev=>({...prev,[key]:{
    ...prev[key],
    created:true,
    videoStatus:"stitched",
    date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
    url:prev[key]?.url||""
  }}));
  // Called from Tracker to set approved / rejected / back to stitched
  const setVideoStatus=(key,status)=>setComboData(prev=>({...prev,[key]:{...prev[key],videoStatus:status,created:status==="approved"}}));
  const updateUrl=(key,url)=>setComboData(prev=>({...prev,[key]:{...prev[key],url}}));
  const updateFilename=(key,filename)=>setComboData(prev=>({...prev,[key]:{...prev[key],filename}}));

  // ── Sync settings ─────────────────────────────────────────────────────────
  const [sheetsUrl,setSheetsUrl]=useState("");
  const [syncState,setSyncState]=useState({});
  const [sheetyUrl,setSheetyUrl]=useState("");
  const [sheetyToken,setSheetyToken]=useState("");
  const [zapierUrl,setZapierUrl]=useState("");
  const [anthropicKey,setAnthropicKey]=useState(()=>localStorage.getItem("avs_anthropic_key")||"");
  useEffect(()=>{ if(anthropicKey) saveSetting("avs_anthropic_key", anthropicKey); },[anthropicKey]);
  useEffect(()=>{ if(zapierUrl)    saveSetting("avs_zapier_url",    zapierUrl);    },[zapierUrl]);
  useEffect(()=>{ if(sheetyUrl)    saveSetting("avs_sheety_url",    sheetyUrl);    },[sheetyUrl]);
  useEffect(()=>{ if(sheetyToken)  saveSetting("avs_sheety_token",  sheetyToken);  },[sheetyToken]);
  useEffect(()=>{ if(sheetsUrl)    saveSetting("avs_sheets_url",    sheetsUrl);    },[sheetsUrl]);

  // ── Load client data when switching clients ───────────────────────────────
  const isMounting = useRef(false);
  useEffect(()=>{
    if(!activeClientId){ return; }
    localStorage.setItem("avs_active_client", activeClientId);
    isMounting.current=true;
    loadClientData(activeClientId).then(d=>{
      setPreHooks(d.preHooks||[]);
      setHooks(d.hooks||[]);
      setTransitions(d.transitions||[]);
      setLeads(d.leads||[]);
      setBodies(d.bodies||[]);
      setCtas(d.ctas||[]);
      setSpeakers(d.speakers||[]);
      setComboData(d.comboData||{});
      setValidationStore(d.validationStore||{});
      setLocked(d.locked||false);
      setAutoAddToTracker(d.autoAddToTracker||false);
      setValidationMode(d.validationMode||"grammar");
      setSheetsUrl(d.sheetsUrl||"");
      setSheetyUrl(d.sheetyUrl||"");
      setSheetyToken(d.sheetyToken||"");
      setZapierUrl(d.zapierUrl||"");
      setSyncState({});
      setTimeout(()=>{ isMounting.current=false; }, 100);
    });
  },[activeClientId]);

  // ── Auto-save whenever state changes ─────────────────────────────────────
  useEffect(()=>{
    if(!activeClientId||isMounting.current) return;
    saveClientData(activeClientId,{preHooks,hooks,transitions,leads,bodies,ctas,speakers,comboData,validationStore,locked,autoAddToTracker,validationMode,sheetsUrl,sheetyUrl,sheetyToken,zapierUrl});
  },[preHooks,hooks,transitions,leads,bodies,ctas,speakers,comboData,validationStore,locked,autoAddToTracker,validationMode,sheetsUrl,sheetyUrl,sheetyToken,zapierUrl]);

  const assetById=useMemo(()=>{
    const m={};
    [...preHooks,...hooks,...transitions,...leads,...bodies,...ctas].forEach(a=>{m[a.id]=a;});
    return m;
  },[preHooks,hooks,transitions,leads,bodies,ctas]);

  const buildSheetyRow=(combo,vr)=>{
    const ph=assetById[combo.preHookId];
    const h=assetById[combo.hookId];
    const l=assetById[combo.leadId];
    const b=assetById[combo.bodyId];
    const c=assetById[combo.ctaId];
    const src=asset=>asset?.driveUrl||asset?.videoFileName||"";
    // Sheety camelCases column headers: "Hook ID" → "hookId", "Date Completed" → "dateCompleted"
    return {
      completed:        combo.created?"✅":"",
      filename:         combo.filename||combo.autoFilename,
      status:           combo.created?"Completed":"Approved / Not Started",
      dateCompleted:    combo.date||"",
      finalOutputUrl:   combo.url||"",
      preHookId:        combo.preHookId||"—",
      preHookSource:    src(ph),
      hookId:           combo.hookId,
      hookDescriptor:   combo.hookDescriptor||"",
      hookSource:       src(h),
      leadId:           combo.leadId,
      leadSource:       src(l),
      bodyId:           combo.bodyId||"—",
      bodySource:       src(b),
      ctaId:            combo.ctaId||"—",
      ctaSource:        src(c),
      tag:              combo.hookTag,
      validationMode:   vr?.mode||"",
      aiVerdict:        vr?.manual?"Manual Override":vr?.valid?"✅ Valid":"❌ Invalid",
      aiReason:         vr?.reason||"",
    };
  };

  const buildRow=(combo,vr)=>{
    const ph=assetById[combo.preHookId];
    const h=assetById[combo.hookId];
    const l=assetById[combo.leadId];
    const b=assetById[combo.bodyId];
    const c=assetById[combo.ctaId];
    const src=asset=>asset?.driveUrl||asset?.videoFileName||"";
    return {
      "Completed":       combo.created ? "✅" : "",
      "Filename":        combo.filename||combo.autoFilename,
      "Status":          combo.created?"Completed":"Approved / Not Started",
      "Date Completed":  combo.date||"",
      "Final Output URL":combo.url||"",
      "Pre-Hook ID":     combo.preHookId||"—",
      "Pre-Hook Source": src(ph),
      "Hook ID":         combo.hookId,
      "Hook Descriptor": combo.hookDescriptor||"",
      "Hook Source":     src(h),
      "Lead ID":         combo.leadId,
      "Lead Source":     src(l),
      "Body ID":         combo.bodyId||"—",
      "Body Source":     src(b),
      "CTA ID":          combo.ctaId||"—",
      "CTA Source":      src(c),
      "Tag":             combo.hookTag,
      "Validation Mode": vr?.mode||"",
      "AI Verdict":      vr?.manual?"Manual Override":vr?.valid?"✅ Valid":"❌ Invalid",
      "AI Reason":       vr?.reason||"",
    };
  };

  const syncRow=async(combo,vr)=>{
    const hasZapier=zapierUrl.trim();
    const hasSheety=sheetyUrl.trim();
    const hasScript=sheetsUrl.trim();
    if(!hasZapier&&!hasSheety&&!hasScript) return;
    setSyncState(prev=>({...prev,[combo.key]:"syncing"}));
    try {
      if(hasZapier){
        const res=await fetch(zapierUrl.trim(),{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(buildRow(combo,vr))
        });
        if(!res.ok) throw new Error("Zapier error");
      } else if(hasSheety){
        const sheetName=sheetyUrl.trim().split("/").pop();
        const headers={"Content-Type":"application/json"};
        if(sheetyToken.trim()) headers["Authorization"]=`Bearer ${sheetyToken.trim()}`;
        const res=await fetch(sheetyUrl.trim(),{method:"POST",headers,body:JSON.stringify({[sheetName]:buildSheetyRow(combo,vr)})});
        if(!res.ok) throw new Error("Sheety error");
      } else {
        fetch(hasScript,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain"},body:JSON.stringify(buildRow(combo,vr))});
      }
      setTimeout(()=>setSyncState(prev=>({...prev,[combo.key]:"synced"})),400);
    } catch {
      setSyncState(prev=>({...prev,[combo.key]:"error"}));
    }
  };

  const syncAll=async(approvedCombos)=>{
    for(const combo of approvedCombos){
      const vr=validationStore[combo.key]||validationStore[`${combo.preHookId||"none"}+${combo.hookId}+${combo.leadId}+none+none+none`];
      await syncRow(combo,vr);
      await new Promise(r=>setTimeout(r,200));
    }
  };

  const tabs=[{id:"library",label:"Asset Library"},{id:"validate",label:"AI Validate"},{id:"tracker",label:"Tracker"},{id:"stitch",label:"🎬 Stitch"},{id:"settings",label:"⚙ Settings"}];
  const [showAdmin,setShowAdmin]=useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-white" style={{fontFamily:"'DM Sans', system-ui, sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap" rel="stylesheet"/>

      {showAdmin&&<AdminModal
        anthropicKey={anthropicKey} setAnthropicKey={setAnthropicKey}
        onClose={()=>setShowAdmin(false)}
        onSupabaseSaved={()=>{
          loadClients().then(c=>setClients(c||[]));
          loadAllSettings().then(s=>{ if(!s) return;
            if(s["avs_anthropic_key"]) setAnthropicKey(s["avs_anthropic_key"]);
            if(s["avs_zapier_url"])    setZapierUrl(s["avs_zapier_url"]);
            if(s["avs_sheety_url"])    setSheetyUrl(s["avs_sheety_url"]);
            if(s["avs_sheety_token"])  setSheetyToken(s["avs_sheety_token"]);
            if(s["avs_sheets_url"])    setSheetsUrl(s["avs_sheets_url"]);
          });
        }}
      />}
      {showClientModal&&<ManageClientsModal
        clients={clients}
        onSave={updated=>{ setClients(updated); saveClients(updated); }}
        onDelete={(id,updated)=>{ setClients(updated); saveClients(updated); if(activeClientId===id){ setActiveClientId(null); localStorage.removeItem("avs_active_client"); }}}
        onClose={()=>setShowClientModal(false)}
      />}

      <div className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-white font-black text-lg tracking-tight">Ad Variation Studio</h1>
            <p className="text-zinc-500 text-xs mt-0.5">Hook · Lead · Transition · Body · CTA</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={()=>setShowAdmin(true)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white text-xs font-semibold rounded-lg transition-colors">⚙ Admin</button>
            <ClientDropdown clients={clients} activeClientId={activeClientId} onSelect={id=>setActiveClientId(id)} onManage={()=>setShowClientModal(true)}/>
            <ProgressRing done={done} total={ringTotal} combos={combos} validationStore={validationStore} locked={locked}/>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-5 flex gap-1">
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab===t.id?"border-amber-500 text-white":"border-transparent text-zinc-500 hover:text-zinc-300"}`}>
              {t.label}
              {t.id==="validate"&&validationResults.length>0&&(
                <span className="ml-1.5 text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{validationResults.length}</span>
              )}
              {t.id==="tracker"&&locked&&<span className="ml-1.5 text-xs">🔒</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 pt-7">
        <div className="flex gap-3 mb-7 flex-wrap">
          {[
            {label:"Pre-hooks",     count:preHooks.length,    color:"text-rose-400"},
            {label:"Hooks",         count:hooks.length,       color:"text-amber-400"},
            {label:"Transitions",   count:transitions.length, color:"text-teal-400"},
            {label:"Leads",         count:leads.length,       color:"text-sky-400"},
            {label:"Bodies",        count:bodies.length,      color:"text-purple-400"},
            {label:"CTAs",          count:ctas.length,        color:"text-pink-400"},
            {label:"Total Possible",count:total,           color:"text-white"},
            ...(validationResults.length>0?[
              {label:"Valid Combos",count:validPairs,color:"text-emerald-400"},
              {label:"Invalid",count:validationResults.filter(r=>r.valid===false).length,color:"text-red-400"},
            ]:[]),
          ].map(s=>(
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 flex items-center gap-2">
              <span className={`text-xl font-black ${s.color}`}>{s.count}</span>
              <span className="text-zinc-500 text-xs">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 pb-12">
        {!activeClientId&&(
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-amber-400 font-semibold text-sm">No client selected</p>
              <p className="text-zinc-500 text-xs mt-0.5">Select a client from the dropdown to save your work, or continue without saving.</p>
            </div>
            <button onClick={()=>setShowClientModal(true)} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold rounded-lg shrink-0 ml-4">＋ Add Client</button>
          </div>
        )}
        {tab==="library" &&<LibraryTab {...{preHooks,setPreHooks,hooks,transitions,setTransitions,leads,bodies,ctas,setHooks,setLeads,setBodies,setCtas,validationStore,speakers,setSpeakers}}/>}
        {/* ValidateTab stays mounted to preserve scope selections and results across tab switches */}
        <div style={{display:tab==="validate"?"block":"none"}}>
          <ValidateTab {...{preHooks,hooks,transitions,leads,bodies,ctas,speakers,validationStore,setValidationStore,locked,setLocked,autoAddToTracker,setAutoAddToTracker,validationMode,setValidationMode,anthropicKey,setTab}}/>
        </div>
        {tab==="tracker" &&<TrackerTab combos={combos} onToggle={toggleCombo} onSetVideoStatus={setVideoStatus} onUrlChange={updateUrl} onFilenameChange={updateFilename} validationStore={validationStore} setValidationStore={setValidationStore} validPairs={validPairs} locked={locked} autoAddToTracker={autoAddToTracker} preHooks={preHooks} hooks={hooks} leads={leads} bodies={bodies} ctas={ctas} sheetsUrl={zapierUrl||sheetyUrl||sheetsUrl} syncState={syncState} onSyncRow={syncRow} onSyncAll={syncAll} buildRow={buildRow} setStitchQueue={setStitchQueue} setTab={setTab}/>}
        {tab==="stitch"  &&<StitchTab combos={combos} validationStore={validationStore} preHooks={preHooks} hooks={hooks} transitions={transitions} leads={leads} bodies={bodies} ctas={ctas} onMarkCreated={toggleCombo} stitchQueue={stitchQueue} setStitchQueue={setStitchQueue}/>}
        {tab==="settings"&&<SettingsTab sheetsUrl={sheetsUrl} setSheetsUrl={setSheetsUrl} sheetyUrl={sheetyUrl} setSheetyUrl={setSheetyUrl} sheetyToken={sheetyToken} setSheetyToken={setSheetyToken} zapierUrl={zapierUrl} setZapierUrl={setZapierUrl}/>}
      </div>
    </div>
  );
}