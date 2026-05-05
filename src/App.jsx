import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "./lib/supabase";

const compostGuideTemplate = {
  slug: "",
  title: "",
  subtitle: "",
  description: "",
  yt_url: "",
  icon: "🌱",
  duration_days: 14,
  theme_color: "#2E7D32",
  tip: "",
  benefits: ["", "", ""],
  materials: ["", "", ""],
  steps: [
    { title: "", description: "" },
    { title: "", description: "" },
    { title: "", description: "" },
  ],
  is_featured: false,
  is_active: true,
  sort_order: 0,
};

const locationTemplate = {
  name: "",
  city: "",
  address: "",
  type: "Bank Sampah",
  phone: "",
  operating_hours: "",
  image_url: "",
  accepted_materials: ["", "", ""],
  latitude: "",
  longitude: "",
  is_active: true,
  is_verified: true,
};

const diyTemplate = {
  title: "",
  description: "",
  category: "Plastik",
  difficulty: "Mudah",
  duration_min: 30,
  image_url: "",
  yt_url: "",
  tags: ["", "", ""],
  materials: ["", "", ""],
  steps: [
    { title: "", description: "" },
    { title: "", description: "" },
    { title: "", description: "" },
  ],
  is_featured: true,
  is_approved: true,
};

const trashBinTemplate = {
  device_id: "",
  name: "RE-BOX",
  location_name: "",
  latitude: "",
  longitude: "",
  is_public: false,
  is_active: true,
  pairing_code: "",
  firebase_path: "",
};

function slugifyDeviceId(value) {
  return `${value || ""}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function makePairingCode() {
  return `RBX-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
}

function buildFirebasePath(deviceId) {
  const normalized = slugifyDeviceId(deviceId);
  if (!normalized || normalized === "rebox_001") return "legacy";
  return `/trash_bins/${normalized}`;
}

function buildQrPayload(pairingCode, deviceId) {
  return JSON.stringify({
    type: "rebox-bin",
    version: 1,
    pairing_code: pairingCode,
    device_id: deviceId,
  });
}

function cleanStringList(items) {
  return (items || []).map((item) => `${item}`.trim()).filter(Boolean);
}

function cleanStepList(steps) {
  return (steps || [])
    .map((step) => ({
      title: `${step.title || ""}`.trim(),
      description: `${step.description || ""}`.trim(),
    }))
    .filter((step) => step.title || step.description);
}

function toGuidePayload(form) {
  return {
    slug: form.slug.trim().toLowerCase(),
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    description: form.description.trim(),
    youtube_url: form.yt_url.trim(),
    icon: form.icon.trim() || "🌱",
    duration_days: Number(form.duration_days) || 14,
    theme_color: form.theme_color.trim() || "#2E7D32",
    tip: form.tip.trim(),
    benefits: cleanStringList(form.benefits),
    materials: cleanStringList(form.materials),
    steps: cleanStepList(form.steps),
    is_featured: Boolean(form.is_featured),
    is_active: Boolean(form.is_active),
    sort_order: Number(form.sort_order) || 0,
  };
}

function toLocationPayload(form) {
  return {
    name: form.name.trim(),
    city: form.city.trim(),
    address: form.address.trim(),
    type: form.type.trim(),
    phone: form.phone.trim(),
    operating_hours: form.operating_hours.trim(),
    image_url: form.image_url.trim(),
    accepted_materials: cleanStringList(form.accepted_materials),
    latitude: form.latitude === "" ? null : Number(form.latitude),
    longitude: form.longitude === "" ? null : Number(form.longitude),
    is_active: Boolean(form.is_active),
    is_verified: Boolean(form.is_verified),
  };
}

function toDiyPayload(form) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    difficulty: form.difficulty.trim(),
    duration_min: Number(form.duration_min) || 0,
    image_url: form.image_url.trim(),
    youtube_url: form.yt_url.trim(),
    tags: cleanStringList(form.tags),
    materials: cleanStringList(form.materials),
    steps: cleanStepList(form.steps),
    is_featured: Boolean(form.is_featured),
    is_approved: Boolean(form.is_approved),
  };
}

function toTrashBinPayload(form) {
  const deviceId = slugifyDeviceId(form.device_id);
  const pairingCode = `${form.pairing_code || makePairingCode()}`.trim().toUpperCase();
  const firebasePath = form.firebase_path.trim() || buildFirebasePath(deviceId);

  return {
    device_id: deviceId,
    name: form.name.trim() || "RE-BOX",
    location_name: form.location_name.trim(),
    latitude: form.latitude === "" ? null : Number(form.latitude),
    longitude: form.longitude === "" ? null : Number(form.longitude),
    is_public: Boolean(form.is_public),
    is_active: Boolean(form.is_active),
    pairing_code: pairingCode,
    firebase_path: firebasePath,
    qr_payload: buildQrPayload(pairingCode, deviceId),
  };
}

function StatCard({ label, value, tone = "default" }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AuthCard({ email, password, setEmail, setPassword, onSubmit, loading, error }) {
  return (
    <div className="auth-card">
      <div>
        <p className="eyebrow">RE-BOX Content Console</p>
        <h1>Admin workspace for compost and recycle data.</h1>
        <p className="lead">
          Sign in with a Supabase account that has authenticated access. This dashboard updates
          the same tables used by the React Native app.
        </p>
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
        </label>
        <button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
        {error ? <p className="error-text">{error}</p> : null}
      </form>
    </div>
  );
}

function ListEditor({ label, values, onChange }) {
  const updateValue = (index, nextValue) => {
    const next = [...values];
    next[index] = nextValue;
    onChange(next);
  };

  return (
    <div className="field-group">
      <span className="field-label">{label}</span>
      {values.map((value, index) => (
        <input
          key={`${label}-${index}`}
          value={value}
          onChange={(event) => updateValue(index, event.target.value)}
          placeholder={`${label} ${index + 1}`}
        />
      ))}
    </div>
  );
}

function StepsEditor({ steps, onChange }) {
  const updateStep = (index, field, value) => {
    const next = steps.map((step, stepIndex) => {
      if (stepIndex !== index) return step;
      return { ...step, [field]: value };
    });
    onChange(next);
  };

  return (
    <div className="field-group">
      <span className="field-label">Steps</span>
      {steps.map((step, index) => (
        <div key={`step-${index}`} className="step-editor">
          <input
            value={step.title}
            onChange={(event) => updateStep(index, "title", event.target.value)}
            placeholder={`Step ${index + 1} title`}
          />
          <textarea
            value={step.description}
            onChange={(event) => updateStep(index, "description", event.target.value)}
            placeholder={`Step ${index + 1} description`}
            rows={3}
          />
        </div>
      ))}
    </div>
  );
}

function CompostGuideSection({ records, onRefresh }) {
  const [form, setForm] = useState(compostGuideTemplate);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      ...compostGuideTemplate,
      ...item,
      yt_url: item.youtube_url || "",
      benefits: [...(item.benefits || ["", "", ""]), "", ""].slice(0, 5),
      materials: [...(item.materials || ["", "", ""]), "", ""].slice(0, 5),
      steps: [...(item.steps || compostGuideTemplate.steps), ...compostGuideTemplate.steps].slice(0, 5),
    });
  };

  const reset = () => {
    setEditingId(null);
    setForm(compostGuideTemplate);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = toGuidePayload(form);
    const query = editingId
      ? supabase.from("compost_guides").update(payload).eq("id", editingId)
      : supabase.from("compost_guides").insert(payload);
    const { error } = await query;
    setSaving(false);
    if (error) return alert(error.message);
    reset();
    onRefresh();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this compost guide?")) return;
    const { error } = await supabase.from("compost_guides").delete().eq("id", id);
    if (error) return alert(error.message);
    if (editingId === id) reset();
    onRefresh();
  };

  return (
    <section className="admin-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Eco-Compost</p>
          <h2>Compost guides</h2>
        </div>
        <button className="ghost-button" onClick={reset}>New guide</button>
      </div>

      <div className="section-layout">
        <div className="record-list">
          {records.map((item) => (
            <article key={item.id} className="record-card">
              <div className="record-title-row">
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.subtitle || item.slug}</p>
                </div>
                <span className={`pill ${item.is_active ? "active" : "muted"}`}>
                  {item.is_active ? "Active" : "Hidden"}
                </span>
              </div>
              <p>{item.description}</p>
              <div className="record-meta">
                <span>{item.duration_days} days</span>
                <span>{item.theme_color}</span>
              </div>
              {item.youtube_url ? <p>{item.youtube_url}</p> : null}
              <div className="record-actions">
                <button onClick={() => startEdit(item)}>Edit</button>
                <button className="danger" onClick={() => remove(item.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>

        <form className="editor-card" onSubmit={save}>
          <div className="editor-grid">
            <label>
              Slug
              <input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required />
            </label>
            <label>
              Icon
              <input value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} />
            </label>
            <label>
              Title
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            </label>
            <label>
              Subtitle
              <input value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} />
            </label>
            <label className="full-span">
              Description
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} required />
            </label>
            <label className="full-span">
              YouTube URL
              <input value={form.yt_url} onChange={(event) => setForm({ ...form, yt_url: event.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
            </label>
            <label>
              Duration Days
              <input value={form.duration_days} onChange={(event) => setForm({ ...form, duration_days: event.target.value })} type="number" min="1" />
            </label>
            <label>
              Theme Color
              <input value={form.theme_color} onChange={(event) => setForm({ ...form, theme_color: event.target.value })} />
            </label>
            <label className="full-span">
              Tip
              <textarea value={form.tip} onChange={(event) => setForm({ ...form, tip: event.target.value })} rows={3} />
            </label>
          </div>

          <ListEditor label="Benefits" values={form.benefits} onChange={(benefits) => setForm({ ...form, benefits })} />
          <ListEditor label="Materials" values={form.materials} onChange={(materials) => setForm({ ...form, materials })} />
          <StepsEditor steps={form.steps} onChange={(steps) => setForm({ ...form, steps })} />

          <div className="toggle-row">
            <label><input checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} type="checkbox" /> Active</label>
            <label><input checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} type="checkbox" /> Featured</label>
            <label>
              Sort Order
              <input value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.value })} type="number" />
            </label>
          </div>

          <button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Update guide" : "Create guide"}</button>
        </form>
      </div>
    </section>
  );
}

function RecycleLocationSection({ records, onRefresh }) {
  const [form, setForm] = useState(locationTemplate);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      ...locationTemplate,
      ...item,
      accepted_materials: [...(item.accepted_materials || ["", "", ""]), "", ""].slice(0, 5),
      latitude: item.latitude ?? "",
      longitude: item.longitude ?? "",
    });
  };

  const reset = () => {
    setEditingId(null);
    setForm(locationTemplate);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = toLocationPayload(form);
    const query = editingId
      ? supabase.from("recycle_locations").update(payload).eq("id", editingId)
      : supabase.from("recycle_locations").insert(payload);
    const { error } = await query;
    setSaving(false);
    if (error) return alert(error.message);
    reset();
    onRefresh();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this location?")) return;
    const { error } = await supabase.from("recycle_locations").delete().eq("id", id);
    if (error) return alert(error.message);
    if (editingId === id) reset();
    onRefresh();
  };

  return (
    <section className="admin-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Recycle Hub</p>
          <h2>Drop-off locations</h2>
        </div>
        <button className="ghost-button" onClick={reset}>New location</button>
      </div>

      <div className="section-layout">
        <div className="record-list">
          {records.map((item) => (
            <article key={item.id} className="record-card">
              <div className="record-title-row">
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.city} • {item.type}</p>
                </div>
                <span className={`pill ${item.is_verified ? "active" : "muted"}`}>
                  {item.is_verified ? "Verified" : "Draft"}
                </span>
              </div>
              <p>{item.address}</p>
              <div className="record-meta">
                <span>{item.operating_hours || "No hours"}</span>
                <span>{(item.accepted_materials || []).join(", ")}</span>
              </div>
              <div className="record-actions">
                <button onClick={() => startEdit(item)}>Edit</button>
                <button className="danger" onClick={() => remove(item.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>

        <form className="editor-card" onSubmit={save}>
          <div className="editor-grid">
            <label>
              Name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label>
              Type
              <input value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} required />
            </label>
            <label>
              City
              <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required />
            </label>
            <label>
              Phone
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </label>
            <label className="full-span">
              Address
              <textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} rows={3} required />
            </label>
            <label>
              Hours
              <input value={form.operating_hours} onChange={(event) => setForm({ ...form, operating_hours: event.target.value })} />
            </label>
            <label>
              Image URL
              <input value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} />
            </label>
            <label>
              Latitude
              <input value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} type="number" step="any" />
            </label>
            <label>
              Longitude
              <input value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} type="number" step="any" />
            </label>
          </div>

          <ListEditor
            label="Accepted Materials"
            values={form.accepted_materials}
            onChange={(accepted_materials) => setForm({ ...form, accepted_materials })}
          />

          <div className="toggle-row">
            <label><input checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} type="checkbox" /> Active</label>
            <label><input checked={form.is_verified} onChange={(event) => setForm({ ...form, is_verified: event.target.checked })} type="checkbox" /> Verified</label>
          </div>

          <button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Update location" : "Create location"}</button>
        </form>
      </div>
    </section>
  );
}

function DiyProjectSection({ records, onRefresh }) {
  const [form, setForm] = useState(diyTemplate);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      ...diyTemplate,
      ...item,
      yt_url: item.youtube_url || "",
      tags: [...(item.tags || ["", "", ""]), "", ""].slice(0, 5),
      materials: [...(item.materials || ["", "", ""]), "", ""].slice(0, 5),
      steps: [...(item.steps || diyTemplate.steps), ...diyTemplate.steps].slice(0, 5),
    });
  };

  const reset = () => {
    setEditingId(null);
    setForm(diyTemplate);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = toDiyPayload(form);
    const query = editingId
      ? supabase.from("diy_projects").update(payload).eq("id", editingId)
      : supabase.from("diy_projects").insert(payload);
    const { error } = await query;
    setSaving(false);
    if (error) return alert(error.message);
    reset();
    onRefresh();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this DIY project?")) return;
    const { error } = await supabase.from("diy_projects").delete().eq("id", id);
    if (error) return alert(error.message);
    if (editingId === id) reset();
    onRefresh();
  };

  return (
    <section className="admin-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Recycle Hub</p>
          <h2>DIY project catalog</h2>
        </div>
        <button className="ghost-button" onClick={reset}>New project</button>
      </div>

      <div className="section-layout">
        <div className="record-list">
          {records.map((item) => (
            <article key={item.id} className="record-card">
              <div className="record-title-row">
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.category} • {item.difficulty}</p>
                </div>
                <span className={`pill ${item.is_featured ? "active" : "muted"}`}>
                  {item.is_featured ? "Featured" : "Standard"}
                </span>
              </div>
              <p>{item.description}</p>
              <div className="record-meta">
                <span>{item.duration_min} min</span>
                <span>{(item.tags || []).join(", ")}</span>
              </div>
              {item.youtube_url ? <p>{item.youtube_url}</p> : null}
              <div className="record-actions">
                <button onClick={() => startEdit(item)}>Edit</button>
                <button className="danger" onClick={() => remove(item.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>

        <form className="editor-card" onSubmit={save}>
          <div className="editor-grid">
            <label>
              Title
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            </label>
            <label>
              Category
              <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required />
            </label>
            <label>
              Difficulty
              <input value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value })} required />
            </label>
            <label>
              Duration Minutes
              <input value={form.duration_min} onChange={(event) => setForm({ ...form, duration_min: event.target.value })} type="number" min="0" />
            </label>
            <label className="full-span">
              Description
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} required />
            </label>
            <label className="full-span">
              Image URL
              <input value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} />
            </label>
            <label className="full-span">
              YouTube URL
              <input value={form.yt_url} onChange={(event) => setForm({ ...form, yt_url: event.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
            </label>
          </div>

          <ListEditor label="Tags" values={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
          <ListEditor label="Materials" values={form.materials} onChange={(materials) => setForm({ ...form, materials })} />
          <StepsEditor steps={form.steps} onChange={(steps) => setForm({ ...form, steps })} />

          <div className="toggle-row">
            <label><input checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} type="checkbox" /> Featured</label>
            <label><input checked={form.is_approved} onChange={(event) => setForm({ ...form, is_approved: event.target.checked })} type="checkbox" /> Approved</label>
          </div>

          <button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Update project" : "Create project"}</button>
        </form>
      </div>
    </section>
  );
}

function TrashBinSection({ records, onRefresh }) {
  const [form, setForm] = useState(trashBinTemplate);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [qrPreview, setQrPreview] = useState("");

  useEffect(() => {
    const payload = buildQrPayload(
      `${form.pairing_code || makePairingCode()}`.trim().toUpperCase(),
      slugifyDeviceId(form.device_id)
    );

    QRCode.toDataURL(payload, {
      margin: 1,
      width: 260,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(setQrPreview)
      .catch(() => setQrPreview(""));
  }, [form.device_id, form.pairing_code]);

  const reset = () => {
    setEditingId(null);
    setForm({
      ...trashBinTemplate,
      pairing_code: makePairingCode(),
    });
  };

  useEffect(() => {
    reset();
  }, []);

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      ...trashBinTemplate,
      ...item,
      latitude: item.latitude ?? "",
      longitude: item.longitude ?? "",
    });
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = toTrashBinPayload(form);
    const query = editingId
      ? supabase.from("trash_bins").update(payload).eq("id", editingId)
      : supabase.from("trash_bins").insert(payload);
    const { error } = await query;
    setSaving(false);
    if (error) return alert(error.message);
    reset();
    onRefresh();
  };

  const regenerateCode = () => {
    setForm((current) => ({ ...current, pairing_code: makePairingCode() }));
  };

  return (
    <section className="admin-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">IoT Fleet</p>
          <h2>Trash bin registry</h2>
        </div>
        <button className="ghost-button" onClick={reset}>New trash bin</button>
      </div>

      <div className="section-layout">
        <div className="record-list">
          {records.map((item) => (
            <article key={item.id} className="record-card">
              <div className="record-title-row">
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.device_id}</p>
                </div>
                <span className={`pill ${item.is_active ? "active" : "muted"}`}>
                  {item.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="record-meta">
                <span>{item.pairing_code}</span>
                <span>{item.firebase_path || "legacy"}</span>
              </div>
              <p>{item.location_name || "No location set yet."}</p>
              <div className="record-actions">
                <button onClick={() => startEdit(item)}>Edit</button>
              </div>
            </article>
          ))}
        </div>

        <form className="editor-card" onSubmit={save}>
          <div className="editor-grid">
            <label>
              Device ID
              <input
                value={form.device_id}
                onChange={(event) => setForm({ ...form, device_id: slugifyDeviceId(event.target.value) })}
                placeholder="rebox-a1b2c3"
                required
              />
            </label>
            <label>
              Name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label className="full-span">
              Location Name
              <input value={form.location_name} onChange={(event) => setForm({ ...form, location_name: event.target.value })} />
            </label>
            <label>
              Pairing Code
              <input value={form.pairing_code} onChange={(event) => setForm({ ...form, pairing_code: event.target.value.toUpperCase() })} required />
            </label>
            <label>
              Firebase Path
              <input
                value={form.firebase_path}
                onChange={(event) => setForm({ ...form, firebase_path: event.target.value })}
                placeholder={buildFirebasePath(form.device_id)}
              />
            </label>
            <label>
              Latitude
              <input value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} type="number" step="any" />
            </label>
            <label>
              Longitude
              <input value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} type="number" step="any" />
            </label>
          </div>

          <div className="toggle-row">
            <label><input checked={form.is_public} onChange={(event) => setForm({ ...form, is_public: event.target.checked })} type="checkbox" /> Public</label>
            <label><input checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} type="checkbox" /> Active</label>
            <button type="button" className="ghost-button" onClick={regenerateCode}>Reset pairing code</button>
          </div>

          <div className="qr-preview-card">
            <div>
              <p className="eyebrow">QR Preview</p>
              <p className="lead compact">Payload ini yang di-scan mobile app sesudah login.</p>
            </div>
            {qrPreview ? <img className="qr-image" src={qrPreview} alt="RE-BOX QR preview" /> : null}
            <code className="payload-block">{buildQrPayload(
              `${form.pairing_code || makePairingCode()}`.trim().toUpperCase(),
              slugifyDeviceId(form.device_id)
            )}</code>
          </div>

          <button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Update trash bin" : "Create trash bin"}</button>
        </form>
      </div>
    </section>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [compostGuides, setCompostGuides] = useState([]);
  const [recycleLocations, setRecycleLocations] = useState([]);
  const [diyProjects, setDiyProjects] = useState([]);
  const [trashBins, setTrashBins] = useState([]);

  const loadDashboard = async () => {
    setDashboardLoading(true);
    const [guidesRes, locationsRes, projectsRes, binsRes] = await Promise.all([
      supabase.from("compost_guides").select("*").order("sort_order", { ascending: true }),
      supabase.from("recycle_locations").select("*").order("created_at", { ascending: false }),
      supabase.from("diy_projects").select("*").order("created_at", { ascending: false }),
      supabase.from("trash_bins").select("*").order("created_at", { ascending: false }),
    ]);
    setDashboardLoading(false);

    if (guidesRes.error) return alert(guidesRes.error.message);
    if (locationsRes.error) return alert(locationsRes.error.message);
    if (projectsRes.error) return alert(projectsRes.error.message);
    if (binsRes.error) return alert(binsRes.error.message);

    setCompostGuides(guidesRes.data || []);
    setRecycleLocations(locationsRes.data || []);
    setDiyProjects(projectsRes.data || []);
    setTrashBins(binsRes.data || []);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setAuthLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    loadDashboard();
  }, [session]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginLoading(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoginLoading(false);
    if (error) setAuthError(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (authLoading) {
    return <div className="screen-state">Checking session...</div>;
  }

  if (!session) {
    return (
      <main className="app-shell auth-shell">
        <AuthCard
          email={email}
          password={password}
          setEmail={setEmail}
          setPassword={setPassword}
          onSubmit={handleLogin}
          loading={loginLoading}
          error={authError}
        />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">RE-BOX Admin</p>
          <h1>Content operations dashboard</h1>
          <p className="lead">Manage the Eco-Compost and Re-Cycle Hub data shown in the mobile app.</p>
        </div>
        <div className="topbar-actions">
          <button className="ghost-button" onClick={loadDashboard}>{dashboardLoading ? "Refreshing..." : "Refresh"}</button>
          <button className="ghost-button danger" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <section className="stats-grid">
        <StatCard label="Compost Guides" value={compostGuides.length} tone="green" />
        <StatCard label="Drop-off Locations" value={recycleLocations.length} tone="blue" />
        <StatCard label="DIY Projects" value={diyProjects.length} tone="slate" />
        <StatCard label="Trash Bins" value={trashBins.length} tone="blue" />
      </section>

      <TrashBinSection records={trashBins} onRefresh={loadDashboard} />
      <CompostGuideSection records={compostGuides} onRefresh={loadDashboard} />
      <RecycleLocationSection records={recycleLocations} onRefresh={loadDashboard} />
      <DiyProjectSection records={diyProjects} onRefresh={loadDashboard} />
    </main>
  );
}
