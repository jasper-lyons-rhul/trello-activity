ENV['RACK_ENV'] = 'test'

require 'minitest/autorun'

require_relative '../organization.rb'

mock_org = Struct.new(:display_name, :boards, :members)

describe Organization do
  let(:org) { mock_org.new('', [], []) }

  it 'should render text' do
    expect(Organization.new(org).to_s).must_be_instance_of(String)
  end
end
