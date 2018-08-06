ENV['RACK_ENV'] = 'test'

require 'minitest/autorun'

require_relative '../organizations.rb'

describe Organizations do
  it 'should render text' do
    expect(Organizations.new.to_s).must_be_instance_of(String)
  end
end
