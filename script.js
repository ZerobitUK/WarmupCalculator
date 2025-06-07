// Using defer in the script tag means we don't strictly need DOMContentLoaded,
// but it's good practice and doesn't hurt.
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const workoutForm = document.getElementById('workoutForm'); // Get the form itself
    const exerciseSelect = document.getElementById('exercise');
    const desiredWeightInput = document.getElementById('desiredWeight');
    const increaseWeightButton = document.getElementById('increaseWeight');
    const decreaseWeightButton = document.getElementById('decreaseWeight');
    const plateCheckboxes = document.querySelectorAll('.plate-checkbox input');
    const selectAllPlatesButton = document.getElementById('selectAllPlates');
    const resetPlatesButton = document.getElementById('resetPlates');
    const minus10PercentWeightDisplay = document.getElementById('minus10PercentWeight');
    const warmupSetsDisplay = document.getElementById('warmupSetsDisplay');

    // ... all your existing JavaScript functions (initStorage, loadLastState, etc.) go here ...
    // --- The rest of your script from the HTML file is pasted below ---
    
    // Constants
    const barbellWeight = 20; // Standard Olympic barbell weight in kg

    // --- Initialization ---
    function initStorage() {
        const exercises = ['bench', 'deadlift', 'overhead', 'row', 'squat'];
        const defaultPlates = ['25', '20', '15', '10', '5', '2.5', '1.25'];

        exercises.forEach(ex => {
            if (!localStorage.getItem(`lastWeight_${ex}`)) {
                localStorage.setItem(`lastWeight_${ex}`, '20');
            }
            ['25', '20', '15', '10', '5', '2.5', '1.25', '1', '0.75', '0.5', '0.25'].forEach(plate => {
                const plateKey = `plate_${ex}_${plate}`;
                if (localStorage.getItem(plateKey) === null) {
                    localStorage.setItem(plateKey, defaultPlates.includes(plate) ? 'true' : 'false');
                }
            });
        });
    }

    function loadLastState() {
        const selectedExercise = exerciseSelect.value;
        const lastWeight = localStorage.getItem(`lastWeight_${selectedExercise}`);
        desiredWeightInput.value = lastWeight ? parseFloat(lastWeight).toFixed(1) : barbellWeight.toFixed(1);

        plateCheckboxes.forEach(checkbox => {
            const isChecked = localStorage.getItem(`plate_${selectedExercise}_${checkbox.value}`) === 'true';
            checkbox.checked = isChecked;
        });
        triggerUpdates();
    }

    function saveCurrentState() {
        const selectedExercise = exerciseSelect.value;
        localStorage.setItem(`lastWeight_${selectedExercise}`, parseFloat(desiredWeightInput.value).toFixed(1));
        plateCheckboxes.forEach(checkbox => {
            localStorage.setItem(`plate_${selectedExercise}_${checkbox.value}`, checkbox.checked);
        });
    }

    // --- Weight Adjustments & Calculations ---
    function adjustWeight(amount) {
        let currentWeight = parseFloat(desiredWeightInput.value) || barbellWeight;
        currentWeight += amount;
        desiredWeightInput.value = Math.max(barbellWeight, currentWeight).toFixed(1);
        triggerUpdates();
    }

    function updateMinus10PercentWeight() {
        let desiredWeight = parseFloat(desiredWeightInput.value) || 0;
        let minus10PercentWeight = (desiredWeight * 0.9).toFixed(1);
        minus10PercentWeightDisplay.innerText = minus10PercentWeight;
    }

    function getSelectedPlates() {
        return Array.from(plateCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => parseFloat(checkbox.value))
            .sort((a, b) => b - a);
    }

    function calculateOptimalWeight(targetWeight, availablePlates) {
        if (targetWeight <= barbellWeight) {
            return { weight: barbellWeight, platePairs: [] };
        }
        let weightOnBar = targetWeight - barbellWeight;
        let weightPerSide = weightOnBar / 2;
        let currentWeightPerSide = 0;
        let usedPlatesPerSide = [];

        for (const plate of availablePlates) {
            while (currentWeightPerSide + plate <= weightPerSide + 0.01) {
                currentWeightPerSide += plate;
                let existingPlate = usedPlatesPerSide.find(p => p.plate === plate);
                if (existingPlate) {
                    existingPlate.count++;
                } else {
                    usedPlatesPerSide.push({ plate: plate, count: 1 });
                }
                if (Math.abs(weightPerSide - currentWeightPerSide) < plate * 0.5 && currentWeightPerSide > weightPerSide - plate) break;
            }
        }
        const achievableTotalWeight = barbellWeight + (currentWeightPerSide * 2);
        return { weight: achievableTotalWeight, platePairs: usedPlatesPerSide };
    }

    function getPlateBreakdown(platePairs) {
        if (!platePairs || platePairs.length === 0) return "Bar only";
        return platePairs.map(pair => `${pair.plate}kg x ${pair.count}`).join('<br>');
    }

    // --- Warmup Set Generation (StrongLifts 5x5 Logic) ---
    function generateWarmupSets(workWeight, availablePlates) {
        const selectedExercise = exerciseSelect.value;
        let warmupConfig = [];
        let workSetStructure = '5x5';
        workWeight = Math.max(barbellWeight, workWeight);

        if (selectedExercise === 'squat') {
            warmupConfig.push({ reps: '2x5', fixedWeight: barbellWeight });
            if (workWeight > barbellWeight + 10) warmupConfig.push({ reps: '1x5', percentage: 0.40, min: barbellWeight + 5 });
            if (workWeight > barbellWeight + 20) warmupConfig.push({ reps: '1x3', percentage: 0.60, min: barbellWeight + 10 });
            if (workWeight > barbellWeight + 30) warmupConfig.push({ reps: '1x2', percentage: 0.80, min: barbellWeight + 15 });
        } else if (selectedExercise === 'bench') {
            warmupConfig.push({ reps: '2x5', fixedWeight: barbellWeight });
            if (workWeight > barbellWeight + 5) warmupConfig.push({ reps: '1x5', percentage: 0.50, min: barbellWeight + 2.5});
            if (workWeight > barbellWeight + 15) warmupConfig.push({ reps: '1x3', percentage: 0.70, min: barbellWeight + 5 });
            if (workWeight > barbellWeight + 25) warmupConfig.push({ reps: '1x2', percentage: 0.85, min: barbellWeight + 10 });
        } else if (selectedExercise === 'overhead') {
            warmupConfig.push({ reps: '2x5', fixedWeight: barbellWeight });
            if (workWeight > barbellWeight + 2.5) warmupConfig.push({ reps: '1x5', percentage: 0.55, min: barbellWeight + 1.25 });
            if (workWeight > barbellWeight + 10) warmupConfig.push({ reps: '1x3', percentage: 0.70, min: barbellWeight + 2.5 });
            if (workWeight > barbellWeight + 20) warmupConfig.push({ reps: '1x2', percentage: 0.85, min: barbellWeight + 5 });
        } else if (selectedExercise === 'row') {
            const firstWarmupWeight = Math.max(barbellWeight, workWeight * 0.4, workWeight > 40 ? 30 : barbellWeight);
            if (workWeight > barbellWeight) {
                 if (firstWarmupWeight < workWeight - 2.5) warmupConfig.push({ reps: '1x5', fixedWeight: firstWarmupWeight });
            }
            if (workWeight > firstWarmupWeight + 10 && workWeight > 40) warmupConfig.push({ reps: '1x3', percentage: 0.70, min: firstWarmupWeight + 5});
        } else if (selectedExercise === 'deadlift') {
            workSetStructure = '1x5';
            const firstWarmupDl = Math.max(barbellWeight, workWeight * 0.4, workWeight > 60 ? 40 : barbellWeight);
             if (workWeight > barbellWeight) {
                if (firstWarmupDl < workWeight - 5) warmupConfig.push({ reps: '1x5', fixedWeight: firstWarmupDl });
             }
            if (workWeight > firstWarmupDl + 15 && workWeight > 60) warmupConfig.push({ reps: '1x3', percentage: 0.65, min: firstWarmupDl + 10 });
            if (workWeight > firstWarmupDl + 30 && workWeight > 80) warmupConfig.push({ reps: '1x2', percentage: 0.80, min: firstWarmupDl + 20 });
        }

        let calculatedSets = [];
        warmupConfig.forEach(config => {
            let targetWarmupWeight;
            if (config.fixedWeight !== undefined) {
                targetWarmupWeight = config.fixedWeight;
            } else {
                targetWarmupWeight = workWeight * config.percentage;
            }
            if (config.min !== undefined) {
                targetWarmupWeight = Math.max(targetWarmupWeight, config.min);
            }
            targetWarmupWeight = Math.max(barbellWeight, targetWarmupWeight);
            targetWarmupWeight = Math.min(targetWarmupWeight, workWeight - 0.5);

            if (targetWarmupWeight < barbellWeight + 0.1 && config.fixedWeight === undefined) return;

            const optimal = calculateOptimalWeight(targetWarmupWeight, availablePlates);
            calculatedSets.push({
                set: config.reps,
                weight: optimal.weight,
                plates: getPlateBreakdown(optimal.platePairs),
                percentageDisplay: workWeight > 0 ? `(${(optimal.weight / workWeight * 100).toFixed(0)}%)` : ''
            });
        });

        const workSetOptimal = calculateOptimalWeight(workWeight, availablePlates);
        calculatedSets.push({
            set: workSetStructure,
            weight: workSetOptimal.weight,
            plates: getPlateBreakdown(workSetOptimal.platePairs),
            percentageDisplay: '<strong>Work Set</strong>'
        });

        const finalSets = [];
        if (calculatedSets.length > 0) {
            finalSets.push(calculatedSets[0]);
            for (let i = 1; i < calculatedSets.length; i++) {
                const currentS = calculatedSets[i];
                const prevS = finalSets[finalSets.length - 1];

                if (currentS.percentageDisplay.includes('Work Set')) {
                    if (prevS.weight === currentS.weight && !prevS.percentageDisplay.includes('Work Set')) {
                        finalSets.pop();
                    }
                    finalSets.push(currentS);
                    continue;
                }
                if ((currentS.weight === prevS.weight && currentS.set === prevS.set) || currentS.weight >= workWeight) {
                     if (!(finalSets.length === 1 && currentS.weight === barbellWeight && workWeight === barbellWeight)) {
                        continue;
                     }
                }
                finalSets.push(currentS);
            }
        }
        if (workWeight === barbellWeight && finalSets.length > 1) {
            return [finalSets[finalSets.length-1]];
        }
        return finalSets;
    }

    // --- Display Update ---
    function displayWarmupSets() {
        const currentWorkWeight = parseFloat(desiredWeightInput.value);
        if (isNaN(currentWorkWeight) || currentWorkWeight < barbellWeight) {
            warmupSetsDisplay.innerHTML = "<p>Enter a valid work set weight (at least " + barbellWeight + " kg).</p>";
            return;
        }
        const selectedPlates = getSelectedPlates();
        if (selectedPlates.length === 0 && currentWorkWeight > barbellWeight) {
             warmupSetsDisplay.innerHTML = "<p>Please select available plates to calculate loads.</p>";
        }

        const setsToDisplay = generateWarmupSets(currentWorkWeight, selectedPlates);
        if (setsToDisplay.length === 0) {
            warmupSetsDisplay.innerHTML = "<p>No warmup sets to display for this weight/exercise.</p>";
            return;
        }

        let tableHTML = `<h2>Warmup & Work Sets</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Set</th>
                                    <th>Weight (kg)</th>
                                    <th>Plates (per side)</th>
                                </tr>
                            </thead>
                            <tbody>`;
        setsToDisplay.forEach(s => {
            tableHTML += `<tr>
                            <td>${s.set} <span style="font-size:0.85em; color: #aaa;">${s.percentageDisplay}</span></td>
                            <td>${s.weight.toFixed(1)}</td>
                            <td>${s.plates}</td>
                          </tr>`;
        });
        tableHTML += `</tbody></table>`;
        warmupSetsDisplay.innerHTML = tableHTML;
    }
    

    // --- Event Listeners & Initial Load ---
    function triggerUpdates() {
        updateMinus10PercentWeight();
        displayWarmupSets();
        saveCurrentState();
    }

    // UPDATED/NEW event listener
    workoutForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevents the default form submission behavior
    });
    
    exerciseSelect.addEventListener('change', () => {
        loadLastState();
    });
    desiredWeightInput.addEventListener('input', triggerUpdates);
    desiredWeightInput.addEventListener('change', triggerUpdates);
    plateCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', triggerNextUpdate);
    });
    increaseWeightButton.addEventListener('click', () => adjustWeight(0.5));
    decreaseWeightButton.addEventListener('click', () => adjustWeight(-0.5));
    selectAllPlatesButton.addEventListener('click', () => {
        plateCheckboxes.forEach(checkbox => checkbox.checked = true);
        triggerUpdates();
    });
    resetPlatesButton.addEventListener('click', () => {
        plateCheckboxes.forEach(checkbox => checkbox.checked = false);
        triggerUpdates();
    });

    initStorage();
    loadLastState();
});
