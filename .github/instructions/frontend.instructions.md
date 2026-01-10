---
applyTo: 'src/js/**/*.js'
---

# Frontend JavaScript Code Guidelines

## Module Structure

- Each module should have a clear, single responsibility
- Export functions and classes that need to be used by other modules
- Use named exports for better IDE support and refactoring
- Import dependencies at the top of the file

## DOM Manipulation

- Use modern DOM APIs (querySelector, querySelectorAll)
- Cache DOM element references when used multiple times
- Add event listeners through addEventListener, not inline handlers
- Clean up event listeners when removing elements
- Use event delegation for dynamically created elements

## Async Operations

- Always use async/await for asynchronous code
- Wrap async operations in try/catch blocks
- Show loading states during async operations
- Handle errors gracefully with user-friendly messages
- Consider timeout handling for long-running operations

## State Management

- Keep state close to where it's used
- Use local storage for persistent data
- Clear sensitive data (tokens) appropriately
- Validate state before using it

## Error Handling

- Always catch and handle errors from async operations
- Log errors to console for debugging
- Show user-friendly error messages in UI
- Don't expose sensitive information in error messages
- Handle network errors (offline, timeout, etc.)

## Performance

- Minimize DOM manipulations (batch updates when possible)
- Debounce/throttle frequent events (scroll, resize, input)
- Lazy load features that aren't immediately needed
- Avoid memory leaks (remove event listeners, clear timers)

## GitHub API Integration

- Use the API wrapper in `src/js/api/`
- Handle rate limiting gracefully
- Cache responses when appropriate
- Handle authentication errors
- Implement proper pagination for large datasets

## UI Components

- Keep components focused and reusable
- Accept configuration through parameters
- Return references to created elements when needed
- Document expected HTML structure if component modifies DOM
- Use consistent styling with existing components
