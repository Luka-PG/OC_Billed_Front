/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from '@testing-library/dom'
import NewBillUI from '../views/NewBillUI.js'
import NewBill from '../containers/NewBill.js'
import { ROUTES, ROUTES_PATH } from '../constants/routes'
import { localStorageMock } from '../__mocks__/localStorage.js'
import userEvent from '@testing-library/user-event'
import mockStore from '../__mocks__/store.js'
import router from '../app/Router.js'

// mock le store qu'on va utiliser
jest.mock('../app/Store', () => mockStore)

describe('Given I am connected as an employee', () => {
  beforeEach(() => {
    // affiche les données de la page employé
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    window.localStorage.setItem(
      'user',
      JSON.stringify({
        type: 'Employee',
        email: 'a@a',
      })
    )
  })
  describe('When I am on NewBill Page', () => {
    // l'icône mail doit être en surbrilliance
    test('Then mail icon in vertical layout should be highlighted', async () => {
      const root = document.createElement('div')
      root.setAttribute('id', 'root')
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.NewBill)
      await waitFor(() => screen.getByTestId('icon-mail'))
      const mailIcon = screen.getByTestId('icon-mail') // récupère l'icône par son testid
      expect(mailIcon).toHaveClass('active-icon') //check si l'icône est en surbrillance - on vérifie si l'élément a la classe correspondante
    })
    // le formulaire doit être présent à l'écran avec tous ses champs
    test('Then the form should be displayed', () => {
      const html = NewBillUI()
      document.body.innerHTML = html
      expect(screen.getByTestId('form-new-bill')).toBeTruthy()
      expect(screen.getByTestId('expense-type')).toBeTruthy()
      expect(screen.getByTestId('expense-name')).toBeTruthy()
      expect(screen.getByTestId('datepicker')).toBeTruthy()
      expect(screen.getByTestId('amount')).toBeTruthy()
      expect(screen.getByTestId('vat')).toBeTruthy()
      expect(screen.getByTestId('pct')).toBeTruthy()
      expect(screen.getByTestId('commentary')).toBeTruthy()
      expect(screen.getByTestId('file')).toBeTruthy()
      expect(screen.getByRole('button')).toBeTruthy()
    })
    //tests pour l'upload de fichier
    describe('When I upload a file', () => {
      // clear tous les mocks avant et après chaque test, assure que chaque test tourne bien avec le mock correct
      beforeEach(() => {
        jest.clearAllMocks()
      })
      afterEach(() => {
        jest.clearAllMocks()
      })
      // on peut sélectionner un fichier png jpg ou jpeg
      test('Then, I can select a png, jpg or jpeg file', () => {
        //affiche les données de la page
        const html = NewBillUI()
        document.body.innerHTML = html
        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname })
        }
        const newBillContainer = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        })

        const changeFile = jest.spyOn(newBillContainer, "handleChangeFile") // créé la fonction à tester
        const file = screen.getByTestId('file') // récupère l'input file
        expect(file).toBeTruthy() // vérifie qu'il soit bien présent à l'écran

        const testFile = new File(['sample.jpg'], 'sample.jpg', {
          type: 'image/jpg',
        }) // créé un fichier de type jpg à tester

        file.addEventListener('change', changeFile) // écoute la fonction au changement de fichier
        userEvent.upload(file, testFile) // upload le fichier test

        expect(changeFile).toHaveBeenCalled() // on s'attend à ce que la fonction ait été appellée
        expect(file.files[0]).toEqual(testFile) // le fichier uploadé est bien le fichier test
        expect(file.files[0].name).toBe('sample.jpg') // le nom du fichier correspond au fichier test

        jest.spyOn(window, 'alert').mockImplementation(() => {}) // mock l'appel de l'alerte
        expect(window.alert).not.toHaveBeenCalled() // s'attend à ce que l'alerte n'ai pas été appellée
      })
      // on ne peut pas upload un fichier qui n'est pas une image
      test("Then, I can't select a non-image file, and the page displays an alert", () => {
        document.body.innerHTML = NewBillUI();
        //mock nill
        const newbill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const handleChangeFile = jest.spyOn(newbill, "handleChangeFile");
        // on écoute le mock de changement de fichier
        const fileInput = screen.getByTestId("file");
        const file = new File(["file"], "example.jpg", {
          type: "image/jpg",
        });

        fileInput.addEventListener("change", handleChangeFile);
        userEvent.upload(fileInput, file);
        // test bon si un appel est fait
        expect(handleChangeFile).toHaveBeenCalled();
        expect(fileInput.files[0]).toStrictEqual(file);
      })
    })
  })
})

//Test d'intégration POST
describe('Given I am a user connected as Employee', () => {
  describe('When I submit a completed form', () => {
    test('Then a new bill should be created', async () => {
      document.body.innerHTML = NewBillUI();
      //on mock une facture
      const newbill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });
      // on simule le submit et le update des bills
      const handleSubmit = jest.spyOn(newbill, "handleSubmit");
      const updateBill = jest.spyOn(newbill, "updateBill");

      const getMockedList = await mockStore.bills().list();
      const MockedList = getMockedList[0];

      newbill.updateBill(MockedList); // on simule la nouvelle facture dans le "updateBill" 

      const submitButton = screen.getByTestId("form-new-bill");
      submitButton.addEventListener("click", handleSubmit);
      userEvent.click(submitButton);

      expect(handleSubmit).toHaveBeenCalled(); // on s'attends à ce que la fonction envoi soit appelé
      expect(updateBill).toHaveBeenCalledWith(
        expect.objectContaining(MockedList) //on apelle la fonction update avec les nouvelles infos
      )
    })
  })
})
