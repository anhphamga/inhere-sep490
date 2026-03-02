import StaffCalendar from './StaffCalendar'
import { useNavigate } from 'react-router-dom'

const OwnerShiftsScreen = () => {
    const navigate = useNavigate()

    return <StaffCalendar onBack={() => navigate('/owner/staff')} />
}

export default OwnerShiftsScreen
