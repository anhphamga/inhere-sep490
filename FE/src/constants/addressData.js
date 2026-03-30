import addressTree from './vn-addresses-tree.json'

const toSortedValues = (record = {}, mapper) => {
    return Object.values(record)
        .map(mapper)
        .sort((a, b) => a.localeCompare(b, 'vi'))
}

export const ADDRESS_DATA = Object.values(addressTree)
    .map((province) => ({
        province: province.name_with_type || province.name || '',
        districts: Object.values(province['quan-huyen'] || {})
            .map((district) => ({
                district: district.name_with_type || district.name || '',
                wards: toSortedValues(district['xa-phuong'], (ward) => ward.name_with_type || ward.name || '')
            }))
            .sort((a, b) => a.district.localeCompare(b.district, 'vi'))
    }))
    .sort((a, b) => a.province.localeCompare(b.province, 'vi'))
