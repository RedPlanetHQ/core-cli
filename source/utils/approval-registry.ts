/**
 * Approval Registry
 * Manages tool approval requests across main agent and nested subagents
 */

import type {ToolCall} from '@/types/core';

export interface ApprovalMetadata {
	source: 'main' | 'subagent';
	subagentType?: string;
	chain?: string[]; // e.g., ['main', 'explore_subagent']
}

export interface PendingApproval {
	toolCall: ToolCall;
	metadata: ApprovalMetadata;
	resolve: (approved: boolean) => void;
	reject: (error: Error) => void;
}

class ApprovalRegistry {
	private pendingApproval: PendingApproval | null = null;
	private approvalQueue: PendingApproval[] = [];
	private onApprovalNeededCallback: ((approval: PendingApproval) => void) | null =
		null;

	/**
	 * Request approval for a tool call
	 * Returns a promise that resolves when user approves/rejects
	 */
	async request(
		toolCall: ToolCall,
		metadata: ApprovalMetadata,
	): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			const approval: PendingApproval = {
				toolCall,
				metadata,
				resolve,
				reject,
			};

			// Add to queue
			this.approvalQueue.push(approval);

			// Process if this is the first one
			if (this.approvalQueue.length === 1) {
				this.processNext();
			}
		});
	}

	/**
	 * Process the next approval in the queue
	 */
	private processNext(): void {
		if (this.approvalQueue.length === 0) {
			this.pendingApproval = null;
			return;
		}

		this.pendingApproval = this.approvalQueue[0];

		// Notify the UI that approval is needed
		if (this.onApprovalNeededCallback) {
			this.onApprovalNeededCallback(this.pendingApproval);
		}
	}

	/**
	 * Get the current pending approval (for UI to display)
	 */
	getPending(): PendingApproval | null {
		return this.pendingApproval;
	}

	/**
	 * Resolve an approval request
	 */
	resolve(toolCallId: string, approved: boolean): void {
		if (!this.pendingApproval || this.pendingApproval.toolCall.id !== toolCallId) {
			console.warn(
				`Attempted to resolve approval for ${toolCallId} but it's not pending`,
			);
			return;
		}

		// Resolve the promise
		this.pendingApproval.resolve(approved);

		// Remove from queue
		this.approvalQueue.shift();

		// Process next
		this.processNext();
	}

	/**
	 * Reject an approval request with an error
	 */
	rejectWithError(toolCallId: string, error: Error): void {
		if (!this.pendingApproval || this.pendingApproval.toolCall.id !== toolCallId) {
			console.warn(
				`Attempted to reject approval for ${toolCallId} but it's not pending`,
			);
			return;
		}

		// Reject the promise
		this.pendingApproval.reject(error);

		// Remove from queue
		this.approvalQueue.shift();

		// Process next
		this.processNext();
	}

	/**
	 * Cancel all pending approvals (e.g., when user cancels the operation)
	 */
	cancelAll(): void {
		for (const approval of this.approvalQueue) {
			approval.reject(new Error('Approval cancelled by user'));
		}
		this.approvalQueue = [];
		this.pendingApproval = null;
	}

	/**
	 * Register callback to be notified when approval is needed
	 */
	onApprovalNeeded(callback: (approval: PendingApproval) => void): void {
		this.onApprovalNeededCallback = callback;
	}

	/**
	 * Clear the approval needed callback
	 */
	clearApprovalNeededCallback(): void {
		this.onApprovalNeededCallback = null;
	}
}

// Export singleton instance
export const approvalRegistry = new ApprovalRegistry();
