import { useState } from "react";

const FIELD_TYPES = ["str", "int", "float", "bool", "list[str]", "list[int]", "list[float]"];

const styles = {
  container: { marginTop: 8 },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  label: { fontSize: 11, fontWeight: 600, color: "#555" },
  addBtn: {
    fontSize: 10,
    padding: "2px 6px",
    border: "1px solid #ccc",
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
  },
  row: {
    display: "flex",
    gap: 4,
    marginBottom: 4,
    alignItems: "center",
  },
  nameInput: {
    flex: 1,
    fontSize: 11,
    padding: "3px 5px",
    border: "1px solid #ddd",
    borderRadius: 4,
  },
  typeSelect: {
    width: 90,
    fontSize: 11,
    padding: "3px 2px",
    border: "1px solid #ddd",
    borderRadius: 4,
  },
  removeBtn: {
    fontSize: 10,
    padding: "2px 5px",
    border: "none",
    background: "transparent",
    color: "#999",
    cursor: "pointer",
  },
};

export default function SchemaEditor({ fields, onChange }) {
  function addField() {
    onChange([...fields, { name: "", type: "str" }]);
  }

  function updateField(index, key, value) {
    const updated = fields.map((f, i) =>
      i === index ? { ...f, [key]: value } : f
    );
    onChange(updated);
  }

  function removeField(index) {
    onChange(fields.filter((_, i) => i !== index));
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.label}>Output Schema</span>
        <button style={styles.addBtn} onClick={addField}>
          + Field
        </button>
      </div>
      {fields.map((field, i) => (
        <div key={i} style={styles.row}>
          <input
            style={styles.nameInput}
            placeholder="field name"
            value={field.name}
            onChange={(e) => updateField(i, "name", e.target.value)}
          />
          <select
            style={styles.typeSelect}
            value={field.type}
            onChange={(e) => updateField(i, "type", e.target.value)}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button style={styles.removeBtn} onClick={() => removeField(i)}>
            x
          </button>
        </div>
      ))}
    </div>
  );
}
