import { RefreshCw } from 'lucide-react'

const OwnerRefreshButton = ({ onClick, disabled }) => {
    return (
        <button
            type="button"
            className="owner-btn owner-btn-secondary inline-flex items-center justify-center w-10 px-0"
            onClick={onClick}
            disabled={disabled}
            title="Làm mới"
            aria-label="Làm mới"
        >
            <RefreshCw className={`w-4 h-4 ${disabled ? 'animate-spin' : ''}`} />
        </button>
    )
}

export default OwnerRefreshButton
