ENV['RACK_ENV'] = 'test'

require 'minitest/autorun'

require_relative '../organization.rb'

describe Organization do
  it 'should render text' do
    expect(Organization.new.to_s).must_be_instance_of(String)
  end
end
