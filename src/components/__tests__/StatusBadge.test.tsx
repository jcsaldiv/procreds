import { render } from '@testing-library/react-native';
import { StatusBadge } from '../StatusBadge';

test('renders label for status', () => {
  const { getByText } = render(<StatusBadge status="expired" />);
  expect(getByText('Expired')).toBeTruthy();
});
