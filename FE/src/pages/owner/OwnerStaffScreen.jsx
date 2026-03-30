import StaffList from '../../components/owner/StaffList'
import { useNavigate } from 'react-router-dom'

const OwnerStaffScreen = () => {
    const navigate = useNavigate()

    return (
        <StaffList
            onViewCalendar={() => navigate('/owner/shifts')}
            onViewAnalytics={() => navigate('/owner/staff-analytics')}
        />
    )
}

export default OwnerStaffScreen
