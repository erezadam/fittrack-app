# Technical Guidelines (`TECHNICAL_GUIDELINES.md`)

## 1. Defensive Coding (CRITICAL)
Due to the nature of dynamic data in NoSQL and potential "dirty" data from migrations, strict defensive coding is enforced.

### 1.1 String Methods Protection
**Rule**: Never call `.indexOf()`, `.includes()`, or `.startsWith()` on a variable without first verifying it is a string.
*Why?*: Fetching legacy data or `undefined` fields can crash the React render loop ("white screen of death").

**Incorrect**:
```javascript
if (url.includes('youtube')) { ... }
```

**Correct**:
```javascript
if (url && typeof url === 'string' && url.includes('youtube')) { ... }
```

### 1.2 Data Sanitization
**Rule**: Firestore **throws an error** if fields are `undefined`. 
**Requirement**: Before calling `setDoc`, `addDoc`, or `updateDoc`, pass certain objects through a strict cleaning utility (e.g., `storageService.cleanData`).

**Sanitization Logic**:
1. Recursively traverse objects and arrays.
2. If value is `undefined` -> Change to `null` (or remove key).
3. If value is `NaN` -> Change to `0`.
4. If `Date` object -> Convert to ISO String.

## 2. Storage Operations
### 2.1 Upsert Pattern
To support "Planned Workouts" becoming "Completed Workouts" without duplication:
1. Check if the workout object has a valid `id`.
2. **If ID exists**: Use `setDoc(ref, data, { merge: true })`. This updates the existing document (changing status from 'planned' to 'completed').
3. **If ID missing**: Use `addDoc(collection, data)`.

### 2.2 UI State
- **Loading States**: Always wrap async fetch calls in `try/catch/finally` to ensure loading spinners are dismissed even on error.
- **Console Logs**: Use descriptive prefixes in logs (e.g., `[AutoSave]: Saving...`) to aid debugging.
