// script.js
// Initial product backlog data store
let productBacklog = [];
// Array to store tasks currently on the Kanban board
let kanbanTasks = [];

// Global variable to store the ID of the dragged item
let draggedItemId = null;

// Sprint Management Variables
let sprintStartDate = null;
let totalSprintTasks = 0;
const sprintDays = 10; // Fixed duration for MVP
let burndownData = []; // To store [day, remainingTasks]

// Function to render backlog items to the DOM
function renderBacklog() {
    const backlogContainer = document.getElementById('backlog-items-container');
    if (!backlogContainer) {
        console.error('Backlog container not found!');
        return;
    }
    backlogContainer.innerHTML = ''; // Clear existing items

    if (productBacklog.length === 0) {
        backlogContainer.innerHTML = '<p>No backlog items yet. Add some!</p>';
    } else {
        productBacklog.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'backlog-item';
            itemDiv.id = `backlog-item-${item.id}`; // Unique ID for drag & drop
            itemDiv.draggable = true; // Make it draggable

            itemDiv.innerHTML = `
                <h3>${item.name}</h3>
                <p>${item.description}</p>
                <button class="delete-item-btn" data-id="${item.id}">Delete</button>
            `;
            backlogContainer.appendChild(itemDiv);

            // Add dragstart event listener
            itemDiv.addEventListener('dragstart', (event) => {
                draggedItemId = event.target.id;
                event.dataTransfer.setData('text/plain', event.target.id);
                setTimeout(() => { // Use timeout to allow DOM to update before adding class
                    event.target.classList.add('dragging');
                }, 0);
            });

            // Add dragend event listener
            itemDiv.addEventListener('dragend', (event) => {
                draggedItemId = null;
                event.target.classList.remove('dragging');
            });
        });
    }
    addDeleteEventListeners(); // For delete buttons
}

// Function to create a Kanban task card DOM element
function createKanbanTaskCardElement(kanbanTaskObject) {
    const taskCard = document.createElement('div');
    taskCard.className = 'task-card';
    taskCard.id = kanbanTaskObject.id; // Use the ID from the task object
    taskCard.draggable = true;

    taskCard.innerHTML = `
        <h4>${kanbanTaskObject.name}</h4>
        <p>${kanbanTaskObject.description}</p>
    `;

    taskCard.addEventListener('dragstart', (event) => {
        draggedItemId = event.target.id;
        event.dataTransfer.setData('text/plain', event.target.id);
        setTimeout(() => {
            event.target.classList.add('dragging');
        }, 0);
    });

    taskCard.addEventListener('dragend', (event) => {
        draggedItemId = null;
        event.target.classList.remove('dragging');
    });

    return taskCard;
}

// Function to handle form submission for adding new backlog items
function handleAddBacklogItem(event) {
    event.preventDefault(); // Prevent default form submission

    const itemNameInput = document.getElementById('backlog-item-name');
    const itemDescriptionInput = document.getElementById('backlog-item-description');

    if (!itemNameInput || !itemDescriptionInput) {
        console.error('Form input fields not found!');
        return;
    }

    const itemName = itemNameInput.value.trim();
    const itemDescription = itemDescriptionInput.value.trim();

    if (itemName === '' || itemDescription === '') {
        alert('Please fill in both fields for the backlog item.');
        return;
    }

    const newItem = {
        id: Date.now(), // Unique ID for the item
        name: itemName,
        description: itemDescription
    };

    productBacklog.push(newItem);
    renderBacklog(); // Re-render the backlog to display the new item

    // Clear form fields
    itemNameInput.value = '';
    itemDescriptionInput.value = '';
}

// Function to handle deleting backlog items
function handleDeleteBacklogItem(event) {
    if (event.target.classList.contains('delete-item-btn')) {
        const itemId = parseInt(event.target.getAttribute('data-id'));
        productBacklog = productBacklog.filter(item => item.id !== itemId);
        renderBacklog(); // Re-render the backlog
    }
}

// Function to add event listeners to delete buttons
function addDeleteEventListeners() {
    const backlogContainer = document.getElementById('backlog-items-container');
    if (backlogContainer) {
        backlogContainer.removeEventListener('click', handleDeleteBacklogItem); // Remove old listeners to prevent duplicates
        backlogContainer.addEventListener('click', handleDeleteBacklogItem);
    }
}


// Add event listener to the backlog item form once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const addBacklogItemForm = document.getElementById('add-backlog-item-form');
    if (addBacklogItemForm) {
        addBacklogItemForm.addEventListener('submit', handleAddBacklogItem);
    } else {
        console.error('Add backlog item form not found!');
    }

    // Setup Kanban columns for drag and drop
    const kanbanTaskContainers = document.querySelectorAll('.kanban-column .tasks-container');

    kanbanTaskContainers.forEach(container => {
        container.addEventListener('dragover', (event) => {
            event.preventDefault(); // Allow dropping
            container.classList.add('drag-over');
        });

        container.addEventListener('dragleave', (event) => {
            container.classList.remove('drag-over');
        });

        container.addEventListener('drop', (event) => {
            event.preventDefault();
            container.classList.remove('drag-over');
            const draggedElementId = event.dataTransfer.getData('text/plain');
            const draggedElement = document.getElementById(draggedElementId);
            const targetColumnId = container.id.replace('-tasks', ''); // e.g., 'todo', 'inprogress', 'done'
            const targetStatus = targetColumnId; // Simplification: column id maps directly to status

            if (draggedElement) {
                if (draggedElementId.startsWith('backlog-item-')) {
                    // Item from backlog: Create new task in kanbanTasks and new DOM element
                    const originalBacklogItemId = draggedElementId.replace('backlog-item-', '');
                    const backlogItemData = productBacklog.find(item => item.id.toString() === originalBacklogItemId);

                    if (backlogItemData) {
                        const newKanbanTaskId = `kanban-task-${Date.now()}`; // Unique ID for Kanban task
                        const newTaskData = {
                            id: newKanbanTaskId,
                            name: backlogItemData.name,
                            description: backlogItemData.description,
                            status: targetStatus,
                            completedAt: targetStatus === 'done' ? Date.now() : null
                        };
                        kanbanTasks.push(newTaskData);
                        const newKanbanCardElement = createKanbanTaskCardElement(newTaskData);
                        container.appendChild(newKanbanCardElement);
                    }
                } else if (draggedElementId.startsWith('kanban-task-')) {
                    // Item from another Kanban column: Update existing task in kanbanTasks and move DOM element
                    const taskToUpdate = kanbanTasks.find(task => task.id === draggedElementId);
                    if (taskToUpdate) {
                        taskToUpdate.status = targetStatus;
                        if (targetStatus === 'done') {
                            taskToUpdate.completedAt = Date.now();
                        } else if (taskToUpdate.completedAt !== null) { // Moved out of 'done'
                            taskToUpdate.completedAt = null;
                        }
                    }
                    // Move the DOM element
                    if (event.target.classList.contains('tasks-container')) {
                        event.target.appendChild(draggedElement);
                    } else if (event.target.closest('.tasks-container')) {
                        event.target.closest('.tasks-container').appendChild(draggedElement);
                    }
                }
                console.log('Kanban tasks:', kanbanTasks); // For verification
                // Check if sprint is active and if the drop affects completion status to update chart
                if (sprintStartDate) {
                    const taskJustChanged = kanbanTasks.find(task => task.id === draggedElementId);
                    if (taskJustChanged) { // if it's a kanban task
                         renderBurndownChart();
                    } else if (draggedElementId.startsWith('backlog-item-')) { // if it's a new item from backlog
                         renderBurndownChart();
                    }
                }
            }
            draggedItemId = null; // Clear after drop
        });
    });

    renderBacklog(); // Initial render of the backlog

    // "Start Sprint" button event listener
    const startSprintBtn = document.getElementById('start-sprint-btn');
    if (startSprintBtn) {
        startSprintBtn.addEventListener('click', () => {
            if (sprintStartDate) {
                if (!confirm("A sprint is already in progress. Do you want to restart it with the current board tasks?")) {
                    return;
                }
            }
            sprintStartDate = new Date();
            totalSprintTasks = kanbanTasks.filter(task => task.status !== 'done').length; // Count only non-done tasks at sprint start
            
            // If all tasks are already in "Done", effectively 0 tasks for burndown.
            if (kanbanTasks.length > 0 && totalSprintTasks === 0) {
                 console.log("Sprint starting with all tasks already in 'Done'. Burndown will reflect this.");
            } else if (kanbanTasks.length === 0){ // No tasks on board at all
                alert("Cannot start a sprint with no tasks on the Kanban board.");
                sprintStartDate = null; 
                return;
            }
            
            console.log(`Sprint started on ${sprintStartDate} with ${totalSprintTasks} active tasks.`);
            renderBurndownChart(); // This will now correctly use the filtered totalSprintTasks
            startSprintBtn.disabled = true;
            startSprintBtn.textContent = "Sprint in Progress";
        });
    } else {
        console.error("Start Sprint button not found!");
    }

    renderBurndownChart(); // Initial render of chart (will show "Sprint not started" or current state)

    // --- Tooltip/Tip Functionality ---
    const tipTriggers = document.querySelectorAll('.tip-trigger');
    const tooltipContents = document.querySelectorAll('.tooltip-content');

    tipTriggers.forEach(trigger => {
        trigger.addEventListener('click', (event) => {
            event.stopPropagation(); 

            const targetId = trigger.id.replace('-trigger', '-content');
            const targetTooltip = document.getElementById(targetId);

            // Hide all other tooltips
            tooltipContents.forEach(tip => {
                if (tip.id !== targetId) {
                    tip.style.display = 'none';
                }
            });

            // Toggle current tooltip
            if (targetTooltip) {
                const isVisible = targetTooltip.style.display === 'block';
                targetTooltip.style.display = isVisible ? 'none' : 'block';

                if (targetTooltip.style.display === 'block' && targetTooltip.style.position === 'absolute') {
                    const triggerRect = trigger.getBoundingClientRect();
                    const bodyRect = document.body.getBoundingClientRect();
                    
                    // Position below the trigger
                    let top = triggerRect.bottom - bodyRect.top + window.scrollY + 5;
                    let left = triggerRect.left - bodyRect.left + window.scrollX;

                    // Basic boundary detection (right edge)
                    if (left + targetTooltip.offsetWidth > bodyRect.width) {
                        left = bodyRect.width - targetTooltip.offsetWidth - 5; // 5px padding from edge
                    }
                     // Basic boundary detection (left edge)
                    if (left < 0) {
                        left = 5; // 5px padding from edge
                    }

                    targetTooltip.style.left = `${left}px`;
                    targetTooltip.style.top = `${top}px`;
                }
            }
        });
    });

    // Click anywhere else to close tooltips
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.tip-trigger') && !event.target.closest('.tooltip-content')) {
            tooltipContents.forEach(tip => {
                tip.style.display = 'none';
            });
        }
    });
});

// Function to render the Sprint Burndown Chart
function renderBurndownChart() {
    const chartContainer = document.getElementById('burndown-chart-container');
    if (!chartContainer) {
        console.error('Burndown chart container not found!');
        return;
    }
    chartContainer.innerHTML = ''; // Clear previous chart

    if (!sprintStartDate) {
        chartContainer.innerHTML = '<p>Sprint not started. Click "Start Sprint" to begin.</p>';
        // Enable the button if it was disabled
        const startSprintBtn = document.getElementById('start-sprint-btn');
        if (startSprintBtn) {
            startSprintBtn.disabled = false;
            startSprintBtn.textContent = "Start Sprint";
        }
        return;
    }

    // --- SVG Chart Rendering ---
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const containerWidth = chartContainer.clientWidth;
    const containerHeight = chartContainer.clientHeight;
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', containerWidth);
    svg.setAttribute('height', containerHeight);
    
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${margin.left},${margin.top})`);
    svg.appendChild(g);

    // --- Data Calculation ---
    // Ideal Line Data
    const idealData = [];
    if (totalSprintTasks > 0) { // Only calculate if there are tasks
        for (let i = 0; i <= sprintDays; i++) {
            idealData.push({ day: i, tasks: totalSprintTasks - (totalSprintTasks / sprintDays) * i });
        }
    } else { // No tasks, ideal line is flat at 0
        for (let i = 0; i <= sprintDays; i++) {
            idealData.push({ day: i, tasks: 0 });
        }
    }

    // Actual Burndown Data
    const actualData = [];
    const today = new Date();
    const elapsedDaysFull = Math.max(0, (today - sprintStartDate) / (1000 * 60 * 60 * 24));

    for (let i = 0; i <= sprintDays; i++) {
        let remainingTasks = totalSprintTasks;
        if (i > elapsedDaysFull + 1 && i <= sprintDays) { // For future days, show last known or project from ideal
             // actualData.push({ day: i, tasks: actualData[actualData.length-1]?.tasks }); // Plateau
            // For simplicity in MVP, let's not project into future for actual line, just plot what we know
            // Or, we can stop plotting actual data if i > current day in sprint
             if (i > Math.floor(elapsedDaysFull) +1 ) continue; // Stop if day 'i' is beyond today + 1
        }

        const dayDate = new Date(sprintStartDate);
        dayDate.setDate(sprintStartDate.getDate() + i);

        let tasksCompletedByDayI = 0;
        kanbanTasks.forEach(task => {
            if (task.completedAt) {
                const completedDate = new Date(task.completedAt);
                // Normalize dates to compare day only
                const normCompletedDate = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate());
                const normDayDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
                if (normCompletedDate <= normDayDate) {
                    tasksCompletedByDayI++;
                }
            }
        });
        remainingTasks = totalSprintTasks - tasksCompletedByDayI;
        actualData.push({ day: i, tasks: remainingTasks });
    }
     // Ensure the first point of actual data is always [0, totalSprintTasks]
    if (!actualData.find(d => d.day === 0)) {
        actualData.unshift({ day: 0, tasks: totalSprintTasks });
    } else {
        actualData.find(d => d.day === 0).tasks = totalSprintTasks;
    }


    // --- Scales ---
    const xScale = (day) => (width / sprintDays) * day;
    // Adjust yScale to handle totalSprintTasks = 0 gracefully
    const yScale = (tasks) => {
        if (totalSprintTasks === 0) {
            return height; // All points will be at the bottom of the chart (0 tasks)
        }
        return height - (height / totalSprintTasks) * tasks;
    };

    // --- Axes ---
    // X Axis (Days)
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', 0);
    xAxis.setAttribute('y1', height);
    xAxis.setAttribute('x2', width);
    xAxis.setAttribute('y2', height);
    xAxis.setAttribute('stroke', '#333');
    g.appendChild(xAxis);

    for (let i = 0; i <= sprintDays; i++) {
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', xScale(i));
        tick.setAttribute('y1', height);
        tick.setAttribute('x2', xScale(i));
        tick.setAttribute('y2', height + 5);
        tick.setAttribute('stroke', '#333');
        g.appendChild(tick);

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', xScale(i));
        label.setAttribute('y', height + 20);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', '10px');
        label.textContent = i;
        g.appendChild(label);
    }
    const xAxisLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xAxisLabel.setAttribute('x', width / 2);
    xAxisLabel.setAttribute('y', height + 35);
    xAxisLabel.setAttribute('text-anchor', 'middle');
    xAxisLabel.textContent = 'Days';
    g.appendChild(xAxisLabel);

    // Y Axis (Tasks Remaining)
    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', 0);
    yAxis.setAttribute('y1', 0);
    yAxis.setAttribute('x2', 0);
    yAxis.setAttribute('y2', height);
    yAxis.setAttribute('stroke', '#333');
    g.appendChild(yAxis);

    for (let i = 0; i <= totalSprintTasks; i += Math.ceil(totalSprintTasks / 10) || 1) { // Adjust step for readability
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', -5);
        tick.setAttribute('y1', yScale(i));
        tick.setAttribute('x2', 0);
        tick.setAttribute('y2', yScale(i));
        tick.setAttribute('stroke', '#333');
        g.appendChild(tick);

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', -10);
        label.setAttribute('y', yScale(i) + 3); // Adjust for alignment
        label.setAttribute('text-anchor', 'end');
        label.setAttribute('font-size', '10px');
        label.textContent = i;
        g.appendChild(label);
    }
    const yAxisLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yAxisLabel.setAttribute('transform', 'rotate(-90)');
    yAxisLabel.setAttribute('x', -height / 2);
    yAxisLabel.setAttribute('y', -margin.left + 15);
    yAxisLabel.setAttribute('text-anchor', 'middle');
    yAxisLabel.textContent = 'Tasks Remaining';
    g.appendChild(yAxisLabel);

    // --- Plot Lines ---
    // Ideal Line
    if (idealData.length > 0) {
        const idealLine = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        const idealPoints = idealData.map(d => `${xScale(d.day)},${yScale(d.tasks)}`).join(' ');
        idealLine.setAttribute('points', idealPoints);
        idealLine.setAttribute('stroke', 'grey');
        idealLine.setAttribute('stroke-dasharray', '4');
        idealLine.setAttribute('fill', 'none');
        idealLine.setAttribute('stroke-width', '2');
        g.appendChild(idealLine);
    }
    
    // Actual Line
    if (actualData.length > 1) { // Need at least 2 points to draw a line
        const actualLine = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        const actualPoints = actualData.map(d => `${xScale(d.day)},${yScale(d.tasks)}`).join(' ');
        actualLine.setAttribute('points', actualPoints);
        actualLine.setAttribute('stroke', 'blue');
        actualLine.setAttribute('fill', 'none');
        actualLine.setAttribute('stroke-width', '2');
        g.appendChild(actualLine);
    } else if (actualData.length === 1) { // Draw a point if only one data point
        const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        point.setAttribute('cx', xScale(actualData[0].day));
        point.setAttribute('cy', yScale(actualData[0].tasks));
        point.setAttribute('r', 3);
        point.setAttribute('fill', 'blue');
        g.appendChild(point);
    } else if (totalSprintTasks === 0 && actualData.length === 0) { // Special case: sprint started with 0 tasks
        const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        point.setAttribute('cx', xScale(0));
        point.setAttribute('cy', yScale(0));
        point.setAttribute('r', 3);
        point.setAttribute('fill', 'blue');
        g.appendChild(point);
        const noTasksText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        noTasksText.setAttribute('x', width / 2);
        noTasksText.setAttribute('y', height / 2);
        noTasksText.setAttribute('text-anchor', 'middle');
        noTasksText.setAttribute('font-size', '14px');
        noTasksText.textContent = "Sprint started with 0 active tasks.";
        g.appendChild(noTasksText);
    }
    
    chartContainer.appendChild(svg);
}
// This SEARCH block was part of the original diff but is now handled by the block above.
// It's removed here to prevent tool errors.
