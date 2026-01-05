/**
 * Result pattern for safe error handling
 */
export class Result {
    constructor(value, error, isOk) {
        this.value = value;
        this.error = error;
        this.isOk = isOk;
    }

    static Ok(value) {
        return new Result(value, null, true);
    }

    static Err(error) {
        return new Result(null, error, false);
    }

    match(handlers) {
        if (this.isOk) {
            return handlers.ok(this.value);
        } else {
            return handlers.err(this.error);
        }
    }

    get isErr() {
        return !this.isOk;
    }
}

