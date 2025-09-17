const express = require('express');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data.json');
const EXPORTS_DIR = path.join(__dirname, 'exports');

// Ensure directories and data file exist
if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR);
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ employees: [], leaves: [] }, null, 2));
}

// ----------------- Load / Save Functions -----------------
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { employees: [], leaves: [] };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ----------------- API Routes -----------------

// Get all employees and leaves filtered by year
app.get('/api/data', (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const data = loadData();

  const filteredLeaves = data.leaves.filter(l => new Date(l.from).getFullYear() === year);

  const employeesWithTotals = data.employees.map(e => {
    const quotaObj = e.quotas?.find(q => q.year === year);
    const quota = quotaObj ? quotaObj.days : null;

    const taken = filteredLeaves
      .filter(l => l.employeeId === e.id)
      .reduce((sum, l) => sum + (l.days || 0), 0);

    return {
      ...e,
      quota,
      totalTaken: taken,
      remaining: quota != null ? quota - taken : null
    };
  });

  res.json({ employees: employeesWithTotals, leaves: filteredLeaves });
});

// Add a new employee with quota for a specific year
app.post('/api/add-employee', (req, res) => {
  const { id, name, year, days } = req.body;
  const data = loadData();

  data.employees.push({
    id,
    name,
    quotas: [{ year: Number(year), days: days != null ? Number(days) : null }]
  });

  saveData(data);
  res.json({ ok: true });
});

// Add leave
app.post('/api/add-leave', (req, res) => {
  const { id, employeeId, from, to, days } = req.body;
  const data = loadData();

  data.leaves.push({ id, employeeId, from, to, days: Number(days) });

  saveData(data);
  res.json({ ok: true });
});

app.get("/api/export-summary", async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const data = loadData();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`Σύνοψη ${year}`);

  // Headers
  sheet.columns = [
    { header: "Όνομα", key: "name", width: 25 },
    { header: "Δικαιούμενες", key: "quota", width: 15 },
    { header: "Πήρε", key: "taken", width: 15 },
    { header: "Υπόλοιπο", key: "remaining", width: 15 },
  ];

  // Rows
  data.employees.forEach((emp) => {
    const quotaObj = emp.quotas?.find((q) => q.year === year);
    const quota = quotaObj ? quotaObj.days : null;

    const taken = data.leaves
      .filter((l) => l.employeeId === emp.id && new Date(l.from).getFullYear() === year)
      .reduce((sum, l) => sum + (l.days || 0), 0);

    sheet.addRow({
      name: emp.name,
      quota: quota ?? "-",
      taken: taken,
      remaining: quota != null ? quota - taken : "-",
    });
  });

  // Style header
  sheet.getRow(1).font = { bold: true };

  // Send file
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=summary_${year}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
});


// Get employees with quota for a specific year
app.get('/api/employees', (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const data = loadData();

  const employeesWithQuota = data.employees.map(e => {
    const quotaObj = e.quotas?.find(q => q.year === year);
    return { 
      id: e.id, 
      name: e.name, 
      quota: quotaObj ? quotaObj.days : null, 
      quotas: e.quotas || [] 
    };
  });

  res.json(employeesWithQuota);
});

// Update employee name or quota for a specific year
app.put('/api/update-employee', (req, res) => {
  const { id, name, year, days } = req.body;
  const data = loadData();
  const empIndex = data.employees.findIndex(e => e.id === id);
  if (empIndex === -1) return res.status(404).json({ error: "Employee not found" });

  data.employees[empIndex].name = name;

  const quotaIndex = data.employees[empIndex].quotas.findIndex(q => q.year === Number(year));
  if (quotaIndex !== -1) {
    data.employees[empIndex].quotas[quotaIndex].days = days != null ? Number(days) : null;
  } else {
    data.employees[empIndex].quotas.push({ year: Number(year), days: days != null ? Number(days) : null });
  }

  saveData(data);
  res.json({ ok: true });
});

app.get('/api/export', async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  try {
    const data = loadData();
    const workbook = new ExcelJS.Workbook();

    function formatDateExcel(dateStr) {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }

    data.employees.forEach(emp => {
      const safeName = emp.name.replace(/[\\\/\?\*\[\]]/g, '').substring(0, 31) || "Employee";
      const sheet = workbook.addWorksheet(safeName);

      const quotaObj = emp.quotas?.find(q => q.year === year);
      const quota = quotaObj ? quotaObj.days : 0;

      // Header
      sheet.addRow(['Όνομα:', emp.name]);
      sheet.addRow(['Δικαιούμενες Ημέρες Άδειας', quota]);
      sheet.addRow(['Έτος:', year]);
      sheet.addRow([]);

      // Table headers
      sheet.addRow(['Άδεια Από', 'Έως', 'Συνολικές Ληφθείσες Άδειες ✅']);
      sheet.getRow(5).font = { bold: true };

      // Get leaves
      const empLeaves = data.leaves
        .filter(l => l.employeeId === emp.id && new Date(l.from).getFullYear() === year);

      let totalDays = 0;
      empLeaves.forEach(l => {
        const validDays = Number(l.days) > 0 ? Number(l.days) : 0;
        sheet.addRow([formatDateExcel(l.from), formatDateExcel(l.to), validDays]);
        totalDays += validDays;
      });

      sheet.addRow([]);
      sheet.addRow(['Ληφθήσες Ημέρες:', totalDays]);
      sheet.columns.forEach(col => col.width = 20);
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `leave-report-${year}-${timestamp}.xlsx`;
    const filepath = path.join(EXPORTS_DIR, filename);

    await workbook.xlsx.writeFile(filepath);
    res.download(filepath, filename);

  } catch (err) {
    console.error('Export error', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Delete employee
app.delete("/api/delete-employee/:id", (req, res) => {
  const { id } = req.params;
  const data = loadData();

  // Remove the employee
  data.employees = data.employees.filter(emp => emp.id !== id);

  // Also remove their leaves
  data.leaves = data.leaves.filter(l => l.employeeId !== id);

  saveData(data);
  res.json({ ok: true });
});



// Update leave
app.put("/api/update-leave", (req, res) => {
  const { id, from, to, days } = req.body;
  const data = loadData();

  const leaveIndex = data.leaves.findIndex((l) => l.id === id);
  if (leaveIndex === -1) {
    return res.status(404).json({ error: "Leave not found" });
  }

  data.leaves[leaveIndex].from = from;
  data.leaves[leaveIndex].to = to;
  data.leaves[leaveIndex].days = Number(days);

  saveData(data);
  res.json({ ok: true });
});

// Delete leave
app.delete("/api/delete-leave/:id", (req, res) => {
  const { id } = req.params;
  const data = loadData();

  data.leaves = data.leaves.filter((l) => l.id !== id);

  saveData(data);
  res.json({ ok: true });
});


// Reset data (development helper)
app.post('/api/reset', (req, res) => {
  saveData({ employees: [], leaves: [] });
  res.json({ ok: true });
});
app.use(express.static(path.join(__dirname, 'client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

const PORT = process.env.PORT || 6050;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));
