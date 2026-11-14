# Common Ground

Build, check and share tools from VS Code or Cursor. Run **Common Ground: Open Start** and sign in with the same Google account you joined your company with.

Receiving and opening shared tools requires no local builder. Building uses the loopback factory (`npm start` in the Common Ground repository).

## Run a received tool on solar data (v0.1.1)

After saving a shared project, return to Start. Under **Opened from Common Ground**, click **Run on solar sample**. The extension reads that project's `inspector.js` and `binding.json`, verifies the source against the saved receipt, and runs it locally in bounded QuickJS inside a worker. No model, API key, terminal command or local factory is required.

The report compares the original public NREL solar sample with a copy containing three removed timestamps and one duplicate. Faults are deliberately injected; these are not claimed to be faults in the original public data. The supported recipient mapping is `measured_on` → time and `ac_power__423` → value, local unspecified time, 60-second cadence, no units row. Physical validity is not assessed.

Downloaded code never executes automatically. Workspace trust and an explicit Run action are required. A source changed since download is rejected. The extension tracks its own receipts and recents; it does not overwrite VS Code's native history.
