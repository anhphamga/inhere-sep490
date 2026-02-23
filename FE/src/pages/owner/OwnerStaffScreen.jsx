import StaffList from './StaffList'
import { useNavigate } from 'react-router-dom'

const OwnerStaffScreen = () => {
    const navigate = useNavigate()

    return (
        <StaffList
            onViewCalendar={() => navigate('/owner/staff-calendar')}
            onViewAnalytics={() => navigate('/owner/staff-analytics')}
        />
    )
}

export default OwnerStaffScreen
