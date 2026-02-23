import styles from './DeleteModal.module.css'

interface DeleteModalProps {
  projectTitle: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteModal({ projectTitle, onConfirm, onCancel }: DeleteModalProps) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Delete Project</h2>
        <p className={styles.message}>
          Are you sure you want to permanently delete{' '}
          <span className={styles.projectName}>"{projectTitle}"</span>?
          This action cannot be undone.
        </p>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.deleteBtn} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
