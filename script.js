// script.js
// Initial product backlog data store
let productBacklog = [];
// Array to store tasks currently on the Kanban board
let kanbanTasks = [];

// Global variable to store the ID of the dragged item
let draggedItemId = null;

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
            }
            draggedItemId = null; // Clear after drop
        });
    });

    renderBacklog(); // Initial render of the backlog
});
