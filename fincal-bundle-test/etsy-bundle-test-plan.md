# FinCal Etsy Bundle - Testing Plan

**Goal:** Validate that the Cash Runway Planner Excel workbook works as advertised, guides correlate properly, and produces human-legible forecasts.

## Test Scope

- Workbook opens correctly in desktop Excel (Mac/Windows)
- Guides (quick start, FAQ, upgrade) reference correct sheets/methods
- Formulas calculate correctly with sample data
- Forecast output is readable and actionable
- Edge cases handled gracefully

---

## Test 1: Workbook Opens Without Errors

**Purpose:** Ensure the file isn't corrupted and opens cleanly.

**Steps:**
1. Open `cash-runway-planner.xlsx` in desktop Excel (Mac Windows)
2. Verify Excel version is 2016 or later (for compatibility with formulas)
3. Check that:
   - No missing reference errors
   - No protection prompts blocking access to example data
   - All tabs render (Inputs, Recurring Income, Recurring Expenses, One-Off Adjustments, Dashboard, Forecast Timeline, Scenario Base, Scenario Conservative, Scenario Optimistic)
   - Chart/graphical elements display

**Expected:** Workbook opens instantly without errors, all sheets visible.

**Pass criteria:** All 9 tabs present and no errors.

---

## Test 2: Quick Start Guide Correlation

**Purpose:** Verify the quick start guide steps actually work in the workbook.

**Steps:**
1. Open quick start guide
2. Follow step 1: Note starting cash location
3. Follow step 2: Navigate to Inputs sheet
4. Step 2a: Verify "Starting Cash" cell exists and is editable
5. Step 2b: Verify "Forecast Start Month" exists
6. Step 2c: Verify "Number of Months to Project" exists
7. Step 2d: Verify "Warning Threshold" exists
8. Follow step 3: Navigate to Recurring Income tab
9. Verify there's an example data row visible (if pre-populated)
10. Follow step 4: Navigate to Recurring Expenses tab
11. Follow step 5: Navigate to One-Off Adjustments tab
12. Follow step 6: Navigate to Forecast Timeline and Dashboard tabs
13. Follow step 7: Verify Scenario tabs exist and are distinguishable

**Expected:** Each guide step maps to an actual sheet/cell in the workbook.

**Pass criteria:** All 13 steps verifiable in the workbook with no missing elements.

---

## Test 3: Formulas Calculate Correctly (Basic Scenario)

**Purpose:** Validate that the core forecast math works.

**Setup:**
- Open `cash-runway-planner.xlsx`
- Go to `Inputs` sheet
- Set Starting Cash to **$10,000**
- Set Forecast Start Month to **April 2026**
- Set Number of Months to Project to **12**
- Set Warning Threshold to **$2,000**

**Recurring Income tab:**
- Row 1: January Paycheck | $5,000 | 2026-04-01

**Recurring Expenses tab:**
- Row 1: Rent | $1,500 | 2026-04-01
- Row 2: Utilities | $200 | 2026-04-15

**One-Off Adjustments tab:**
- Row 1: Server Cost | $300 | 2026-05-01

**Verify:**
1. Dashboard shows Starting Balance: $10,000
2. Dashboard shows Projected Ending Balance (should be roughly $10K + $60K - $21.6K - $300)
3. Forecast Timeline chart shows monthly balance trajectory
4. Lowest Balance KPI is accurate

**Expected:** Numbers add up correctly, chart shows trend.

**Pass criteria:** Manual calculations (spreadsheet or calculator) match workbook output within $1 tolerance.

---

## Test 4: Forecast is Human Legible

**Purpose:** Ensure output is actionable, not just data dump.

**Checklist:**
- [ ] Dashboard has clear title (e.g., "Cash Runway Dashboard")
- [ ] Starting Balance is prominent
- [ ] Projected Ending Balance is prominent
- [ ] Lowest Projected Balance is clearly labeled
- [ ] Warning indicator visible if balance dips below threshold
- [ ] Monthly breakdown readable in Forecast Timeline
- [ ] Chart has clear axis labels (months, $)
- [ ] Data bars or conditional formatting highlights low points
- [ ] Notes/instructions visible explaining what each metric means

**Pass criteria:** A new user can understand their financial position in 30 seconds without reading the full guide.

---

## Test 5: Scenario Comparison Works

**Purpose:** Validate that scenario planning (Base/Conservative/Optimistic) functions.

**Steps:**
1. Copy Base scenario tab to Conservative (duplicate sheet, rename)
2. Modify Conservative tab:
   - Reduce Recurring Income by 20%
   - Increase Recurring Expenses by 10%
3. Copy Base scenario tab to Optimistic (duplicate sheet, rename)
4. Modify Optimistic tab:
   - Increase Recurring Income by 20%
   - Reduce Recurring Expenses by 10%
5. Compare three Dashboard cells for the same metrics
6. Verify numbers adjust appropriately

**Expected:** Conservative shows lower ending balance, Optimistic shows higher.

**Pass criteria:** All three scenarios produce distinct, logically consistent outputs.

---

## Test 6: Edge Cases

**Purpose:** Ensure workbook doesn't crash or produce garbage on edge inputs.

**Test cases:**
| Input | Test | Expected Result |
|-------|------|-----------------|
| Starting Cash = $0 | Inputs | Warning indicator or clear $0 display, no crash |
| Negative Income | Recurring Income | Shows negative value, adds to total |
| Negative Expense | Recurring Expenses | Should probably warn or auto-correct |
| Future start date | Inputs | Works correctly |
| Past start date | Inputs | Gracefully handles |
| Forecast > 60 months | Inputs | Works (or warns if limited) |
| Empty one-off adjustments | One-Off tab | Works (no errors) |

**Pass criteria:** No crashes, no circular references, outputs remain readable.

---

## Test 7: Compatibility Claims Validate

**Purpose:** Verify the compatibility/FAQ claims are true.

**Check:**
- [ ] Open in Google Sheets → check if formulas work (shouldn't be advertised as compatible)
- [ ] Excel on Windows → verify it works
- [ ] Excel on Mac → verify it works
- [ ] Try formula that Google Sheets doesn't support → confirm it fails (as documented)

**Pass criteria:** Compatibility claims match reality.

---

## Test 8: Upgrade Path Messaging

**Purpose:** Verify cross-sell to FinCal app is clear.

**Steps:**
1. Read upgrade-to-fincal.txt
2. Verify claims match what FinCal actually does (from README):
   - FinCal imports CSV/Excel transaction exports ✓
   - FinCal detects recurring income and bills ✓
   - FinCal generates forward-looking cash balance forecast ✓
3. Check that upgrade messaging doesn't overpromise

**Pass criteria:** Upgrade path claims are accurate, not misleading.

---

## Test 9: Fresh User Test (Blind Validation)

**Purpose:** A new person can use it without your help.

**Setup:**
- Give workbook + guides to someone who's never seen them
- Tell them: "Plan your next 6 months of finances"
- Observe without helping

**Metrics:**
- Time to first forecast (target: < 10 minutes)
- Number of questions asked (target: 0-2)
- Ability to spot their lowest projected balance (target: yes)
- Confidence they understand what to do next (target: high)

**Pass criteria:** First-time user completes a forecast and knows next steps.

---

## Test 10: File Distribution Check

**Purpose:** Ensure bundle is packaged for Etsy sale.

**Checklist:**
- [ ] All files present: workbook, quick-start-guide.txt, compatibility-and-faq.txt, upgrade-to-fincal.txt
- [ ] File names are customer-friendly (no "t3code-" prefixes)
- [ ] Workbook has no unsaved changes or temp files embedded
- [ ] File size is reasonable (< 5MB)
- [ ] Excel macros/VBA are disabled or documented (if any)

**Pass criteria:** Bundle is clean and ready for sale.

---

## Execution Order

1. **Day 1:** Tests 1-3 (Open, guide correlation, basic math)
2. **Day 2:** Tests 4-6 (legibility, scenarios, edge cases)
3. **Day 3:** Tests 7-10 (compatibility, upgrade path, fresh user, packaging)

**Tools needed:**
- Desktop Excel (Mac or Windows)
- Another human for Test 9
- Spreadsheet/calculator for verification

---

## Risk Areas

| Risk | Mitigation |
|------|------------|
| Google Sheets breaking formulas | Don't market as compatible; FAQ already says "not officially supported" |
| Formulas change with Excel version | Test on both Mac and Windows Excel |
| User doesn't understand "warning threshold" | Add inline help text to Inputs sheet |
| Chart labels too small on mobile | If shared on web, ensure export to image is clean |
| Upgrade path confusing | Clarify FinCal vs. spreadsheet relationship |

---

## Success Criteria

**Go to Market Ready if:**
- Test 1-8: 100% pass
- Test 9: Fresh user completes forecast with ≤2 questions
- Test 10: Bundle is clean and packaged

**Go to Market Conditional if:**
- Test 1-8: 80%+ pass
- Test 9: Fresh user needs ≤5 questions
- Test 10: Minor packaging tweaks needed

**Do Not Launch if:**
- Any critical test fails (1, 2, 3, 4)
- Test 9: Fresh user cannot complete forecast

---

## Post-Test Actions

If tests pass:
1. Create Etsy listing with provided copy
2. Set pricing based on similar products ($15-29 range)
3. Prepare customer support FAQ based on compatibility-and-faq.txt
4. Track upgrades from spreadsheet → FinCal app

If tests fail:
1. Document exactly which element broke
2. Fix in workbook before relaunch
3. Update guides if necessary
4. Relabel and retest
