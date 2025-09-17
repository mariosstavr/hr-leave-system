import React, { useEffect, useState } from "react";

export default function EditEmployee({ loadData }) {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [quota, setQuota] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());

  // ------------------- Load Employees -------------------
  const loadEmployees = async () => {
    try {
      const res = await fetch(`/api/employees`);
      const data = await res.json();
      setEmployees(data || []);
    } catch (err) {
      console.error("Error loading employees:", err);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // ------------------- Select Employee -------------------
  const handleSelect = (e) => {
    const empId = e.target.value;
    setSelectedId(empId);

    const emp = employees.find((x) => x.id === empId);
    if (emp) {
      setName(emp.name);

      // Get quota for selected year
      const quotaObj = emp.quotas?.find((q) => q.year === year);
      setQuota(quotaObj ? quotaObj.days : "");
    } else {
      setName("");
      setQuota("");
    }
  };

  // ------------------- Update Employee -------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId) return alert("Επέλεξε εργαζόμενο!");

    try {
      await fetch(`/api/update-employee`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedId,
          name,
          year,
          days: quota ? Number(quota) : null,
        }),
      });
      alert("Ο εργαζόμενος ενημερώθηκε!");
      loadEmployees();
      loadData();
    } catch (err) {
      console.error("Error updating employee:", err);
    }
  };

  return (
    <div className="p-4 max-w-md">
      <h2 className="text-xl font-bold mb-4">Επεξεργασία Εργαζομένου</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <select
          value={selectedId}
          onChange={handleSelect}
          className="border p-2 rounded"
          required
        >
          <option value="">-- Επέλεξε υπάλληλο --</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Όνομα εργαζόμενου"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="border p-2 rounded"
        />

        <input
          type="number"
          placeholder="Σύνολο δικαιούμενων ημερών"
          value={quota}
          onChange={(e) => setQuota(e.target.value)}
          className="border p-2 rounded"
        />

        <input
          type="number"
          value={year}
          onChange={(e) => {
            const newYear = Number(e.target.value);
            setYear(newYear);

            const emp = employees.find((x) => x.id === selectedId);
            const quotaObj = emp?.quotas?.find((q) => q.year === newYear);
            setQuota(quotaObj ? quotaObj.days : "");
          }}
          className="border p-2 rounded"
        />

        <div className="text-gray-700">
          Σύνολο ημερών για το {year}: <strong>{quota || 0}</strong>
        </div>

        <button
          type="submit"
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        >
          Ενημέρωση Εργαζόμενου
        </button>
      </form>
    </div>
  );
}
