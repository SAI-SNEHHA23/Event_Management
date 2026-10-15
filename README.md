# College Event Management Website

A responsive college event management website using **HTML, CSS, JavaScript, Node.js, Express, and MySQL**. It uses the background images supplied for this project and reads/writes event records in your MySQL database.

## Pages included

- `index.html` — homepage / landing page
- `list.html` — searchable event directory
- `list1.html` — manage all event records with Edit/Delete links
- `insert.html` — add a new event
- `update.html` — load and edit an event by ID
- `delete.html` — preview and confirm event deletion
- `about.html` — about page
- `style.css` — all styling and responsive layout
- `event.js` — browser-side API calls and page behaviour
- `server.js` — Express server and MySQL CRUD API

## Before you start

1. Install **Node.js LTS** from https://nodejs.org/ if it is not installed.
2. Start your local MySQL server and make sure you know the MySQL username/password.
3. Open the `college-event-management` folder in VS Code.
4. In VS Code, open Terminal → New Terminal.

## Configure MySQL

Your screenshot shows a schema named `events`, a table named `event management`, and these columns:

- `event id` (primary key / auto increment)
- `event name`
- `event time`
- `event day`
- `venue`
- `description`

The server is configured to use those exact names by default. It assumes the ID column is `AUTO_INCREMENT`.

### 1. Check the database in MySQL Workbench

Run:

```sql
USE `events`;
DESCRIBE `event management`;
SELECT * FROM `event management`;
```

If your schema or table has a different name, adjust `.env` below.

### 2. Create your `.env` file

Copy `.env.example` and rename the copy to `.env` (no `.txt` extension). Open `.env` and enter your own MySQL details:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_REAL_MYSQL_PASSWORD
DB_NAME=events
DB_TABLE=event management
```

Replace `YOUR_REAL_MYSQL_PASSWORD` with the password you use for MySQL. Keep `.env` private and do not paste your password into public chats or upload it to GitHub.

### 3. Verify the table shape

If the table is missing, or if its columns do not match your screenshot, create a backup first and then adapt it. For a fresh database, this SQL is compatible with this app:

```sql
CREATE DATABASE IF NOT EXISTS `events`;
USE `events`;

CREATE TABLE IF NOT EXISTS `event management` (
  `event id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `event name` VARCHAR(45) NOT NULL,
  `event time` TIME NOT NULL,
  `event day` DATE NOT NULL,
  `venue` VARCHAR(150) NOT NULL,
  `description` TEXT NOT NULL
);
```

**Do not run the CREATE TABLE statement over an existing table without checking it first.** It will not change an existing table, but its column types and auto-increment settings still need to match the app. Do not delete your current records.

## Run the website at localhost:3000

In the VS Code terminal, make sure the terminal is in this project's root folder (the folder containing `package.json`), then run:

```bash
npm install
```

After it finishes, run:

```bash
npm start
```

Open this URL in your browser:

**http://localhost:3000**

Keep the terminal open while using the site. Do not open the HTML files by double-clicking them; use the localhost URL so the pages can call the server and MySQL.

## How to use the site

- Home: `http://localhost:3000/`
- All Events: `http://localhost:3000/list.html`
- Add Event: `http://localhost:3000/insert.html`
- Manage Events: `http://localhost:3000/list1.html`
- Update Event: `http://localhost:3000/update.html`
- Delete Event: `http://localhost:3000/delete.html`
- About: `http://localhost:3000/about.html`

Add events through **Add Event**. The new record should appear in **All Events** and **Manage Events**. Use Edit to update a record and Delete to preview then confirm a deletion.

## Troubleshooting

### `Access denied for user`
Your MySQL username/password in `.env` is incorrect, or that user lacks permissions. Correct `.env`, save it, and restart `npm start`.

### `Unknown database 'events'`
In MySQL Workbench, check the schema name in the left panel. Update `DB_NAME` in `.env` to match it exactly.

### `Table doesn't exist`
Set `DB_TABLE` to the exact table name, including spaces if present. The default is `event management`.

### `Unknown column`
Run `DESCRIBE \`event management\`;` and compare the exact column names. The code expects the names listed above. If yours differ, edit the constants near the top of `server.js`.

### `npm is not recognized`
Install Node.js LTS, close and reopen VS Code, then try `node -v` and `npm -v` in a new terminal.

### Port 3000 is already in use
Change `PORT=3001` in `.env` and visit `http://localhost:3001`.

## API routes

- `GET /api/health` — checks the MySQL connection
- `GET /api/events` — list all events
- `GET /api/events/:id` — get one event
- `POST /api/events` — create an event
- `PUT /api/events/:id` — update an event
- `DELETE /api/events/:id` — delete an event

The browser uses parameterized SQL for user-supplied values. This is a local learning/demo project; add authentication and authorization before putting it on the public internet.
