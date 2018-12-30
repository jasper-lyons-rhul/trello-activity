require 'test_helper'

class PagesControllerTest < ActionDispatch::IntegrationTest
  test 'can access landing page' do
    get root_url
    assert_response :success
    assert_select '[href="/auth/trello"]'
  end
end
