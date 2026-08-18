const express = require("express");
const res = {
  json: (data) => console.log(JSON.stringify(data))
};
const result = {
  rows: [
    {
      id: "1",
      email: "test",
      projects_json: '[]'
    }
  ]
};
const clients = result.rows.map(row => ({
  ...row,
  projects: row.projects_json ? JSON.parse(row.projects_json) : []
}));
res.json(clients);
