Manage the Vite dev server for this project.

Read $ARGUMENTS to decide what to do:

**start** (default when no argument given):
Run `npm run dev` in the background. Wait for output showing the local URL, then report it to the user.

**stop**:
Run this command to stop Vite gracefully (equivalent to pressing q + Enter in the terminal):
```
pkill -f vite && echo "Dev server stopped" || echo "Dev server was not running"
```
