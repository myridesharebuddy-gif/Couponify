## Developer fixes for Expo Hermes runtime issues

If you encounter `TypeError: (0, _expoModulesCore.requireOptionalNativeModule) is not a function` or `Invariant Violation: "main" has not been registered`, follow this recovery path:

1. **Run the hard rebuild script**  
   ```bash
   npm run rebuild:expo
   ```  
   This removes all cached artifacts (`node_modules`, `.expo`, `ios`, `android`, lockfiles) and reinstalls dependencies with `expo install --fix`, ensuring your SDK 49 environment is consistent.

2. **Restart Metro with a clean state**  
   ```bash
   npx expo start -c
   ```  
   Always launch Expo from the `client/` directory and never run Metro from another project.

3. **Double-check Metro ports**
   - Confirm nothing else listens on `:8081`/`19000`: `lsof -i :8081` / `lsof -i :19000`.  
   - Kill any stale processes before restarting Expo.

4. **Never mix SDK versions**  
   - Do not manually edit `package.json` with arbitrary Expo SDK versions.  
   - Always use `npx expo install` to align packages when updating or adding native dependencies.

5. **Bonus troubleshooting**  
   - If problems persist, delete `client/node_modules` and rerun `npm run rebuild:expo`.  
   - After reinstalling, verify `client/index.js` contains:
     ```js
     import { registerRootComponent } from 'expo';
     import App from './App';
     registerRootComponent(App);
     ```
