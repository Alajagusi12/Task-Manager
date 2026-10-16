# Taskflow

A fast, clean task manager built with vanilla HTML, CSS, and JavaScript. No frameworks, no build step, no dependencies.

**Live demo:** https://alajagusi12.github.io/Teslim/

## Features

- **Task management:** add, edit (double-click), complete, and delete tasks, with undo after deleting
- **Organisation:** priority levels, categories, due dates, and overdue highlighting
- **Views:** list view and a drag-and-drop Kanban board (To do, In progress, Done)
- **Search, filter, and sort:** by status, priority, due date, or newest
- **Insights:** progress ring, live stats, and a 7-day completion chart
- **Focus timer:** a 25-minute Pomodoro with start, pause, and reset
- **Themes:** light and dark mode, remembered between visits
- **Data:** saved in the browser with `localStorage`, plus JSON export and import
- **Polish:** responsive layout, keyboard shortcut (`/` to add a task), accessible labels, and reduced-motion support

## Tech stack

| Layer | Details |
| --- | --- |
| Markup | Semantic HTML5 |
| Styling | CSS custom properties, Grid, Flexbox, responsive design |
| Logic | ES6+ JavaScript, DOM APIs, HTML5 Drag and Drop, `localStorage` |

## Project structure

```
Teslim/
├── index.html   # Page structure
├── style.css    # Themes, layout, and components
├── script.js    # App logic and state
└── README.md
```

## Run locally

1. Clone the repo:
   ```bash
   git clone https://github.com/Alajagusi12/Teslim.git
   cd Teslim
   ```
2. Open `index.html` in your browser. That's it.

## Deploy on GitHub Pages

1. Push the files to the `main` branch.
2. In the repo, go to **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**, then select `main` and `/ (root)`.
4. Your site will be live at `https://<username>.github.io/<repo>/`.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` | Focus the new-task input |
| `Enter` | Save an edit |
| `Esc` | Cancel an edit |

## Roadmap

- [ ] Subtasks and notes
- [ ] Recurring tasks
- [ ] Tags
- [ ] Command palette (`Ctrl + K`)
- [ ] Due-date notifications

## Author

**Teslim Abdulwahab**

- GitHub: [@Alajagusi12](https://github.com/Alajagusi12)
- LinkedIn: [Teslim Alajagusi](https://www.linkedin.com/in/teslim-alajagusi-3ab347438)

## License

Released under the MIT License. Feel free to use and adapt it.
