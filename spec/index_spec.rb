ENV['RACK_ENV'] = 'test'

require 'minitest/autorun'

require_relative '../index.rb'

describe Index do
  let (:key) { '' }

  it 'should render text' do
    expect(Index.new(key).to_s).must_be_instance_of(String)
  end
end
